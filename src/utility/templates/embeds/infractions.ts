import dateToUnixSeconds from "#utility/functions/formatting/dateToUnixSeconds";
import capitalizeFirstLetter from "#utility/functions/formatting/capitalizeFirstLetter";
import infractionModel, {
  Infraction,
  type OmitLogLinkInfraction,
} from "#utility/schemas/infraction.model";
import config from "#config";
import EmbedBuilder from "./default";
import { GuildMember } from "discord.js";
import timeAgo from "#utility/functions/formatting/timeAgo";
import { InfractionPunishment } from "src/typescript/enums/InfractionPunishment";

/**
 * The embed to be sent when an infraction is changed.
 */
function newInfractionChangePunishmentEmbed(
  infraction: Infraction,
  infractionMember?: GuildMember
) {
  return new EmbedBuilder(infractionMember).setDescription(
    `${config.emojis.info} - <@${
      infraction.userId
    }>'s infraction punishment has been changed to \`${
      infraction.punishment?.penalty || "None"
    }\``
  );
}

/**
 * Converts an infraction to a discord.js embed.
 * This embed is meant to only be viewable by staff.
 */
async function newInfractionLogEmbed(
  infraction: OmitLogLinkInfraction,
  affectedMember?: GuildMember
): Promise<EmbedBuilder> {
  // Creating the embed
  const embed = new EmbedBuilder(affectedMember);

  // Finding any previous infractions to display.
  const previousInfractions = await infractionModel.find({
    userId: infraction.userId,
  });

  const capitalizedPenalty = infraction.punishment?.penalty
    ? capitalizeFirstLetter(infraction.punishment.penalty)
    : undefined;

  let previousInfractionDisplay =
    previousInfractions.map(
      (infraction) =>
        `\n\`🔗\` – [\`${timeAgo(infraction.createdAt!)} - ${
          infraction.reason
        }\`](%%${infraction.logLink}%%)`
    ) || [];

  // Ensuring field is not to long.
  while (previousInfractionDisplay.join("").length > 1024) {
    previousInfractionDisplay.pop();
  }

  // Setting all fields.
  embed
    .setFooter({
      text: `%%${infraction._id.toString()}%%`, // %% to stop any number formatting.
      iconURL: config.urls.images.id,
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
        value: `\`${
          infraction.punishment?.penalty
            ? capitalizedPenalty +
              `${
                infraction.punishment.humanReadableDuration
                  ? ` (${infraction.punishment.humanReadableDuration})`
                  : ""
              }`
            : "None"
        }\``,
        inline: true,
      },
      {
        name: "Reason",
        value: `\`${infraction.reason}\``,
        inline: true,
      },
      {
        name: "Date",
        value: `<t:${dateToUnixSeconds(infraction.createdAt!)}>`,
        inline: true,
      },
      {
        name: "Mod Notes",
        value: `\`\`\`${infraction.modNotes || "No notes provided."}\`\`\``,
      },
      {
        name: "Public Notes",
        value: `\`\`\`${infraction.publicNotes || "No notes provided."}\`\`\``,
      },
      {
        name: "Moderator",
        value: `<@${infraction.modId}>`,
        inline: true,
      },
      {
        name: "Related Message",
        value: infraction.relatedMessageLink
          ? `%%${infraction.relatedMessageLink}%%`
          : "`Not Provided`", // %% to avoid auto formatting.
        inline: true,
      },
      {
        name: "Previous Infractions",
        value:
          previousInfractionDisplay.length === 0
            ? "None"
            : previousInfractionDisplay.join(""),
      }
    );

  if (affectedMember) {
    embed.setThumbnail(affectedMember.displayAvatarURL()).setAuthor({
      name: `${affectedMember.displayName} Has Been ${
        infraction.punishment?.penalty ? capitalizedPenalty : "Warn"
      }ed`,
      iconURL: affectedMember.displayAvatarURL(),
    });
  }

  return embed;
}

function successfulInfractionAdministered(id: string, member?: GuildMember) {
  return new EmbedBuilder(member)
    .setTitle("Infraction Administered")
    .setDescription(
      `\`✅\` - Successfully administered infraction to ${member}.`
    )
    .setFooter({
      text: id,
      iconURL: config.urls.images.id,
    });
}

/**
 * Converts an infraction to a discord.js embed.
 * This embed is meant to be viewable my members.
 */
function newPublicInfractionEmbed(
  infraction: Infraction,
  affectedMember?: GuildMember,
  modMember?: GuildMember
) {
  // Creating the embed.
  const embed = new EmbedBuilder(affectedMember);

  const capitalizedPenalty = infraction.punishment?.penalty
    ? capitalizeFirstLetter(infraction.punishment.penalty)
    : undefined;

  // Creating punishment string.
  let punishment = `\`${
    infraction.punishment?.penalty ? capitalizedPenalty : "None"
  }`;

  if (infraction.punishment?.penalty) {
    if (infraction.punishment.humanReadableDuration) {
      punishment += ` (${infraction.punishment.humanReadableDuration})`;
    }
    if (
      modMember &&
      (infraction.punishment.penalty === InfractionPunishment.Ban ||
        infraction.punishment.penalty === InfractionPunishment.TempBan) &&
      !modMember.permissions.has("BanMembers")
    ) {
      punishment += " - (pending approval)";
    }
  }

  punishment += "`";

  // Setting all fields.
  embed
    .setFooter({
      text: `%%${infraction._id.toString()}%%`, // %% to stop any number formatting.
      iconURL: config.urls.images.id,
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
        value: punishment,
        inline: true,
      },
      {
        name: "Reason",
        value: `\`${infraction.reason}\``,
        inline: true,
      },
      {
        name: "Date",
        value: `<t:${dateToUnixSeconds(infraction.createdAt!)}>`,
        inline: true,
      },
      {
        name: "Public Notes",
        value: `\`\`\`${infraction.publicNotes || "No notes provided."}\`\`\``,
      }
      // todo:
      // {
      //   name: "Historical Punishments",
      //   value: infraction.historicalPunishments?.map().join()
      // }
    );

  if (affectedMember) {
    embed.setThumbnail(affectedMember.displayAvatarURL()).setAuthor({
      name: `You Have Been ${
        infraction.punishment?.penalty ? capitalizedPenalty : "Warn"
      }ed`,
      iconURL: affectedMember.displayAvatarURL(),
    });
  }

  return embed;
}

export default {
  newInfractionChangePunishmentEmbed,
  newInfractionLogEmbed,
  newPublicInfractionEmbed,
  successfulInfractionAdministered,
};
