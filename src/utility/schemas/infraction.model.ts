import {
  type DocumentType,
  getModelForClass,
  modelOptions,
  prop,
} from "@typegoose/typegoose";
import type { GuildMember } from "discord.js";
import { InfractionPunishment } from "src/typescript/enums/InfractionPunishment";
import { discordId } from "./types/discordId";
import { Bot } from "neos-handler";
import { TimeStamps } from "@typegoose/typegoose/lib/defaultClasses";
import type { Types } from "mongoose";
import { discordLink } from "./types/discordLink";

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
    immutable: true,
  })
  penalty!: InfractionPunishment;

  /**
   * The duration of the punishment.
   * Only applicable to temporary punishments.
   */
  @prop({
    required: true,
    type: Date,
    immutable: true,
  })
  duration?: number;
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
    index:false,
  })
  changedById!: string;

  @prop(discordLink)
  logLink!: string;
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
    default: "No reason provided."
  })
  reason?: string;

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
  notes?: string;

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
export interface PunishmentDistributorData  {
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
  constructor(
    private data: PunishmentDistributorData
  ) {}

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
  public async changePunishment(member?: GuildMember) {
    // Removing the old punishment.
    await this.removePunishment(member);

    // Administering the new punishment.
    await this.administerPunishment(member);
  }

  /**
   * Removes any administered punishments.
   * @param member - The member to inherit and assign the punishment to. If not specified the method will resolve the member.
   */
  public async removePunishment(member?: GuildMember) {
    // Ensuring there is a penalty on the infraction.
    if (!this.data.punishment?.penalty) {
      return;
    }

    // Ensuring member existence.
    if (!member) {
      member = await this.resolveMember(this.data.userId);
    }

    // Creating a switch statement to handle the punishment.
    switch (this.data.punishment.penalty) {
      case InfractionPunishment.Ban: {
        await member.ban({
          reason: this.data.reason,
        });
        break;
      }
      case InfractionPunishment.Timeout: {
        // Setting timeout to 0 to remove.
        await member.timeout(0);
        break;
      }
      case InfractionPunishment.TempBan: {
        // todo: this. We should call the unban scheduled function early.
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
  public async administerPunishment(member?: GuildMember, guildId?: string) {
    // Ensuring a punishment exists.
    if (!this.data.punishment) return;

    // Ensuring temp punishments have a duration.
    if (
      this.isTempPenalty(this.data.punishment.penalty) &&
      !this.data.punishment.duration
    ) {
      throw new Error("Temporary punishments require a duration.");
    }

    // Ensuring member existence.
    if (!member) {
      member = await this.resolveMember(this.data.userId);

      // Ensuring existence.
      if (!member) {
        throw new Error("Member was not resolved.");
      }
    }

    // Ensuring a duration is present if punishment is temporary (temp-ban/timeout).
    if (
      this.data.punishment &&
      (this.data.punishment.penalty === InfractionPunishment.TempBan ||
        this.data.punishment.penalty === InfractionPunishment.Timeout) &&
      !this.data.punishment.duration
    ) {
      throw new Error(
        "Punishment duration was not specified but punishment is temporary."
      );
    }

    // Creating a switch statement to handle the punishment.
    switch (this.data.punishment.penalty) {
      case InfractionPunishment.TempBan: {
        // Banning.
        await member.ban({
          reason: this.data.reason,
        });

        // todo: Schedule a unban.
        break;
      }
      case InfractionPunishment.Timeout: {
        await member.timeout(
          this.data.punishment.duration!,
          this.data.reason
        );
        break;
      }
      case InfractionPunishment.Kick: {
        await member.kick(this.data.reason);
        break;
      }
      case InfractionPunishment.Ban: {
        await member.ban({
          reason: this.data.reason,
        });
        break;
      }
    }
  }

  // -------------------- PRIVATE HELPERS -------------------- //

  /**
   * This method is used to resolve a userId from an infraction into a member.
   * It will always try getting all information from cache before using the api.
   *
   * @param userId - The id to resolve from.
   */
  private async resolveMember(userId: string) {
    // Resolving the client.
    const client = await Bot.getInstance().container.resolve(
      "@internal/client"
    );

    // Ensuring client existence.
    if (!client) {
      throw new Error("Cannot resolve client.");
    }

    // Resolving the guild.
    let guild = client.guilds.cache.get(Bun.env.STATVILLE_GUILD_ID);

    // Ensuring guild existence.
    if (!guild) {
      guild = await client.guilds.fetch(Bun.env.STATVILLE_GUILD_ID);
    }

    // Get member from the cache first so we avoid api usage.
    let member = guild.members.cache.get(userId);

    if (!member) {
      // If its not found in the cache we will then fetch via the api.
      try {
        member = await guild.members.fetch(userId);
      } catch (error) {
        // Handle possible errors from member fetching
        throw new Error(`Could not resolve member with ID ${userId}: ${error}`);
      }
    }

    // Should now exist so we return it.
    return member;
  }

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
