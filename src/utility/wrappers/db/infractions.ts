import infractionModel, {
  Infraction,
  Punishment,
  PunishmentDistributor,
  type OmitLogLinkInfraction,
} from "#utility/schemas/infraction.model";
import {
  ChatInputCommandInteraction,
  type GuildMember,
  type CacheType,
} from "discord.js";
import EmbedBuilder from "#utility/templates/embeds/default";
import LogUtils, { LogLocation } from "#utility/wrappers/discord/loggers";
import capitalizeFirstLetter from "#utility/functions/formatting/capitalizeFirstLetter";
import dateToUnixSeconds from "#utility/functions/formatting/dateToUnixSeconds";
import InfractionUtils from "#utility/wrappers/db/infractions";

// ---------------------------------------------------------
// | The purpose of these wrappers are to administer       |
// | infractions to members.                               |
// |                                                       |
// | These wrappers handle the storing of the infraction   |
// | inside the database but also registering the          |
// | punishment with Discord.                              |
// ---------------------------------------------------------

async function changeInfractionPunishment(
  member: GuildMember,
  moderatorId: string,
  infractionId: string,
  newPunishment: Punishment | null
) {
  // Finding the infraction doc.
  const infractionDoc = await infractionModel.findOne({
    _id: infractionId,
  });

  // Ensuring infraction existence.
  if (!infractionDoc) {
    throw new Error("Infraction not found.");
  }

  // Creating punishment distro.
  const punishmentDistributor = new PunishmentDistributor({
    reason: infractionDoc.reason!,
    userId: infractionDoc.userId,
    punishment: newPunishment,
  });

  // Logging.
  const log = await LogUtils.log(LogLocation.INFRACTIONS, {
    reply: {
      messageReference: infractionDoc.logLink,
      failIfNotExists: false,
    },
    embeds: [newInfractionChangePunishmentEmbed(member, infractionDoc)],
  });

  if (infractionDoc.punishment) {
    // Setting old punishment as historical.
    if (infractionDoc.historicalPunishments) {
      infractionDoc.historicalPunishments.push({
        changedById: moderatorId,
        historicalAt: new Date(),
        penalty: infractionDoc.punishment.penalty,
        duration: infractionDoc.punishment.duration,
        logLink: log.url,
      });
    }

    // Removing old punishment from discord.
    await punishmentDistributor.removePunishment(member);
  }

  if (newPunishment) {
    // Setting punishment on doc.
    infractionDoc.punishment = newPunishment;

    // Administering with discord.
    punishmentDistributor.setInfraction({
      reason: infractionDoc.reason!,
      punishment: newPunishment,
      userId: infractionDoc.userId,
    }); // todo: we may not need to do this as i beileve js will reference the doc and changed will then sync.
    await punishmentDistributor.administerPunishment(member);
  }

  // Saving.
  await infractionDoc.save();
}

async function administerInfraction(
  member: GuildMember,
  infraction: OmitLogLinkInfraction
) {
  // Creating the infraction doc.
  const infractionDoc = new infractionModel(infraction);

  // Checking if any punishments are needed.
  if (infraction.punishment) {
    // Creating the punishment distributor.
    const punishmentDistributor = new PunishmentDistributor({
      reason: infraction.reason!,
      punishment: infraction.punishment,
      userId: infraction.userId,
    });

    await punishmentDistributor.administerPunishment(member);
  }

  // Logging the infraction.
  const loggedInfraction = await LogUtils.log(
    LogUtils.LogLocation.INFRACTIONS,
    {
      embeds: [await InfractionUtils.newInfractionLogEmbed(member, infraction)],
    }
  );

  // Updating the logged message link for the doc.
  infractionDoc.logLink = loggedInfraction.url;

  // Saving the document and returning it.
  await infractionDoc.save();

  return infractionDoc;
}

/**
 * This function completely deletes/removes an infraction from the db and discord.
 */
async function removeInfraction(member: GuildMember, infractionId: string) {
  // Getting document from database.
  const infractionDoc = await infractionModel.findOne({
    _id: infractionId,
  });

  // Ensuring doc existence.
  if (!infractionDoc) return;

  // Checking if a punishment needs to be removed.
  if (infractionDoc.punishment) {
    // Creating the punishment distributor.
    const punishmentDistributor = new PunishmentDistributor({
      reason: infractionDoc.reason!,
      punishment: infractionDoc.punishment,
      userId: infractionDoc.userId,
    });

    // Removing.
    await punishmentDistributor.removePunishment(member);
  }

  // Deleting in database.
  await infractionDoc.deleteOne();
}

// todo: move everything below to its own file.

function newInfractionChangePunishmentEmbed(
  affectedMember: GuildMember,
  infraction: Infraction
) {
  return new EmbedBuilder(affectedMember).setDescription(
    `${Bun.env.INFO_EMOJI} - ${affectedMember}'s infraction punishment has been changed to a \`${infraction.punishment}\``
  );
}

/**
 * Converts an infraction to a discord.js embed.
 * This embed is meant to only be viewable by staff.
 */
async function newInfractionLogEmbed(
  affectedMember: GuildMember,
  infraction: OmitLogLinkInfraction
): Promise<EmbedBuilder> {
  // Creating the embed
  const embed = new EmbedBuilder(affectedMember);

  // Finding any previous infractions to display.
  const previousInfractions = await infractionModel.find({
    userId: infraction.userId,
  });

  // Setting all fields.
  embed
    .setThumbnail(affectedMember.displayAvatarURL())
    .setAuthor({
      name: `${affectedMember.displayName} Has Been ${
        infraction.punishment?.penalty
          ? capitalizeFirstLetter(infraction.punishment.penalty)
          : "Warn"
      }ed`,
      iconURL: affectedMember.displayAvatarURL(),
    })
    .setFooter({
      text: infraction._id.toString(),
      iconURL:
        "https://whatemoji.org/wp-content/uploads/2020/07/Id-Button-Emoji.png",
    })
    .addFields(
      {
        name: "Member",
        value: `<@${infraction.userId}>`,
        inline: true,
      },
      {
        name: "Channel",
        value: `<#${infraction.channelId}>`,
        inline: true,
      },
      {
        name: "Punishment",
        value: `\`${infraction.punishment || "None"}\``,
        inline: true,
      },
      {
        name: "Reason",
        value: `\`${infraction.reason || "No reason provided."}\``,
        inline: true,
      },
      {
        name: "Date",
        value: `<t:${dateToUnixSeconds(infraction.createdAt!)}>`,
        inline: true,
      },
      {
        name: "Notes",
        value: `\`\`\`${infraction.notes || "No notes provided."}\`\`\``,
      },
      {
        name: "Moderator",
        value: `<@${infraction.modId}>`,
      },
      {
        name: "Previous Infractions",
        value:
          previousInfractions
            .map(
              (infraction) =>
                `\n\`🔗\` – [<t:${dateToUnixSeconds(
                  infraction.createdAt!
                  // Putting the link inside of "%%" so that it dosent get formatted.
                )}:R>](%%${infraction.logLink}%%)`
            )
            .join("") || "N/A",
        inline: true,
      }
      // {
      //   name: "Historical Punishments",
      //   value: infraction.historicalPunishments?.map().join()
      // }
    );

  return embed;
}

/**
 * Converts an infraction to a discord.js embed.
 * This embed is meant to be viewable my members.
 */
function newPublicInfractionEmbed() {}

export default {
  administerInfraction,
  removeInfraction,
  changeInfractionPunishment,
  newInfractionLogEmbed,
};
