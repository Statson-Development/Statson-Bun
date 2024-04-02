import config from "#config";
import { Bot } from "neos-handler";
import type { Types } from "mongoose";
import { Container } from "neos-container";
import { discordId } from "./types/discordId";
import { discordLink } from "./types/discordLink";
import type { Guild, GuildMember } from "discord.js";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import { getModelForClass, modelOptions, prop } from "@typegoose/typegoose";
import { InfractionPunishment } from "src/typescript/enums/InfractionPunishment";

@modelOptions({
  schemaOptions: {
    _id: false,
    versionKey: false,
  },
})
export class Punishment {
  @prop({
    required: true,
    type: String,
    enum: InfractionPunishment,
  })
  penalty!: InfractionPunishment;

  /**
   * The duration of the punishment.
   * Only applicable to temporary punishments.
   */
  @prop({
    required: false,
    type: Number,
  })
  duration?: number;

  @prop({
    required: false,
    type: String,
  })
  humanReadableDuration?: string;
}

export class HistoricalPunishment extends Punishment {
  /**
   * When this punishment was made historical.
   */
  @prop({
    required: true,
    default: new Date(),
    type: Date,
    immutable: true,
  })
  historicalAt!: Date;

  @prop({
    ...discordId,
    unique: false,
    index: false,
  })
  changedById!: string;
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    versionKey: false,
  },
})
export class Infraction extends TimeStamps {
  _id!: Types.ObjectId;

  @prop({
    ...discordId,
    unique: false,
  })
  userId!: string;

  @prop({
    ...discordId,
    unique: false,
    index: false,
  })
  modId!: string;

  @prop({
    required: true,
    type: String,
    minlength: 18,
    maxlength: 20,
  })
  channelId!: string;

  @prop(discordLink)
  logLink!: string;

  @prop({
    required: true,
    type: String,
    default: "No reason provided.",
  })
  reason!: string;

  @prop(discordLink)
  relatedMessageLink?: string;

  @prop({
    required: false,
    type: () => Punishment,
  })
  punishment?: Punishment;

  @prop({
    required: false,
    type: String,
    maxlength: 1024, // To align with discords embed field char limit.
  })
  publicNotes?: string;

  @prop({
    required: false,
    type: String,
    maxlength: 1024, // To align with discords embed field char limit.
  })
  modNotes?: string;

  @prop({
    required: false,
    type: () => [HistoricalPunishment],
  })
  historicalPunishments?: Array<HistoricalPunishment>;
}

// Exporting the model.

const infractionModel = getModelForClass(Infraction);

export default infractionModel;

/**
 * The data that the punishment distributor requires.
 */
export interface PunishmentDistributorData {
  reason: string;
  userId: string;
  punishment: Punishment | null;
}

/**
 * This class handles punishments, it distributes them, changes them, and removes them.
 *
 * The class is always associated with a infraction.
 * Corresponding methods can then be called to handle punishments.
 *
 * This method does not change any infraction properties. For example if you change the punishment, this class will not change it within the doc.
 *
 * @example
 * const pd = new PunishmentDistributor(infractionHere);
 *
 * // Administer the punishment.
 * await pd.administerPunishment()
 *
 * // Optionally you can parse in the member djs object to the method.
 * // This will speed up times as the method does not need to re-resolve the member.
 * await pd.administerPunishment(interaction.member)
 */
export class PunishmentDistributor {
  constructor(private data: PunishmentDistributorData) {}

  // ------------------------ Public Methods ------------------------ //

  /**
   * Resets the current associated infraction.
   */
  public setInfraction(data: PunishmentDistributorData) {
    this.data = data;
  }

  /**
   * This method is used to change the punishment associated with discord.
   * Will not change the punishment with
   *
   * @param member - The member to inherit and assign the punishment to. If not specified the method will resolve the member.
   */
  public async changePunishment(guildId: string) {
    // Removing the old punishment.
    await this.removePunishment(guildId);

    // Administering the new punishment.
    await this.administerPunishment(guildId);
  }

  /**
   * Removes any administered punishments.
   * @param member - The member to inherit and assign the punishment to. If not specified the method will resolve the member.
   */
  public async removePunishment(guild: Guild | string) {
    // Ensuring there is a penalty on the infraction.
    if (!this.data.punishment?.penalty) {
      return;
    }

    // Resolving the guild if need be.
    if (typeof guild === "string") {
      // Resolving the client.
      const client = await Container.getInstance().resolve("@internal/client");

      // Resolving the guild.
      guild = await client.guilds.fetch(guild);
    }

    // Creating a switch statement to handle the punishment.
    switch (this.data.punishment.penalty) {
      case InfractionPunishment.Ban: {
        await guild.bans.remove(
          this.data.userId,
          "User has served ban time associated with infraction."
        );
        break;
      }
      case InfractionPunishment.Timeout: {
        await guild.members.edit(this.data.userId, {
          communicationDisabledUntil: null,
        });
        break;
      }
      case InfractionPunishment.TempBan: {
        // Resolving scheduler.
        const scheduler = await Container.getInstance().resolve("scheduler");

        // Calling the unban scheduled function early.
        await scheduler.runTaskNow("unbanMember", this.data.userId);
        break;
      }
    }
  }

  /**
   * This method administers the punishment associated with the infraction to the member.
   * If no member is parsed to the method, the method will attempt to resolve the member with the guildId param.
   * If no guildId param is specified, the method will use Statville as the guild.
   *
   * @param member - The member to inherit and assign the punishment to. If not specified the method will resolve the member.
   * @param guildId - The guild id to use to resolve the member if need be.
   *
   * @throws {Error} - If the method cannot resolve the guild member.
   *
   * This method could be changed to
   */
  public async administerPunishment(guild: Guild | string) {
    // Ensuring a punishment exists.
    if (!this.data.punishment) return;

    // Ensuring temp punishments have a duration.
    if (
      this.isTempPenalty(this.data.punishment.penalty) &&
      !this.data.punishment.duration
    ) {
      throw new Error("Temporary punishments require a duration.");
    }

    // Resolving the guild if need be.
    if (typeof guild === "string") {
      // Resolving the client.
      const client = await Container.getInstance().resolve("@internal/client");

      // Resolving the guild.
      guild = await client.guilds.fetch(guild);
    }

    // Creating a switch statement to handle the punishment.
    switch (this.data.punishment.penalty) {
      case InfractionPunishment.Ban:
      case InfractionPunishment.TempBan: {
        await guild.bans.create(this.data.userId, {
          reason: this.data.reason,
        });

        if (this.data.punishment.penalty === InfractionPunishment.TempBan) {
          // Resolving scheduler.
          const scheduler = await Container.getInstance().resolve("scheduler");

          // Creating a new task for the unban.
          await scheduler.newTask(
            this.data.punishment.duration! / 1000, // Converting to seconds.
            "unbanMember",
            this.data.userId
          );
        }
        break;
      }
      case InfractionPunishment.Timeout: {
        await guild.members.edit(this.data.userId, {
          communicationDisabledUntil: new Date(
            Date.now() + this.data.punishment.duration!
          ),
        });
        break;
      }
      case InfractionPunishment.Kick: {
        await guild.members.kick(this.data.userId, this.data.reason);
        break;
      }
    }
  }

  // -------------------- PRIVATE HELPERS -------------------- //

  /**
   * Determines if the punishment is temporary.
   */
  private isTempPenalty(penalty: InfractionPunishment) {
    return (
      penalty === InfractionPunishment.TempBan ||
      penalty === InfractionPunishment.Timeout
    );
  }
}

export type OmitLogLinkInfraction = Omit<Infraction, "logLink">;
