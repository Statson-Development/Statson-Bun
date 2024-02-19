import capitalizeFirstLetter from "#utility/functions/formatting/capitalizeFirstLetter";
import dateToUnixSeconds from "#utility/functions/formatting/dateToUnixSeconds";
import infractionModel, {
  Infraction,
  type OmitLogLinkInfraction,
} from "#utility/schemas/infraction.model";
import { GuildMember } from "discord.js";
import EmbedBuilder from "./default";

/**
 * The embed to be sent when an infraction is changed.
 */
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

function newInfractionAdministered(member: GuildMember) {}

export default {
  newInfractionAdministered,
  newInfractionChangePunishmentEmbed,
  newInfractionLogEmbed,
  newPublicInfractionEmbed,
};
