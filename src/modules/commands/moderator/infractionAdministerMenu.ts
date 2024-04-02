import infractionAdministerModel from "#utility/templates/model/infractionAdministerModel";
import {
  Embed,
  GuildMember,
  ModalBuilder,
  ComponentType,
  ActionRowBuilder,
  ApplicationCommandType,
  StringSelectMenuBuilder,
  type GuildTextBasedChannel,
} from "discord.js";
import config from "#config";
import { Container } from "neos-container";
import { commandModule } from "neos-handler";
import moderatorOnly from "../../../plugins/moderatorOnly";
import infractionModel from "#utility/schemas/infraction.model";
import AIPSTraining from "#utility/templates/other/AIPS-training";
import { requestDuration, type DurationRequest } from "./infraction";
import extractMention from "#utility/functions/helper/extractMention";
import InfractionUtils from "../../../utility/wrappers/both/infractions";
import InfractionEmbeds from "../../../utility/templates/embeds/infractions";
import capitalize from "#utility/functions/formatting/capitalizeFirstLetter";
import { InfractionPunishment } from "../../../typescript/enums/InfractionPunishment";

/*
 THIS IS THE CONTEXT MENU VERSION.
 IF YOU ARE LOOKING FOR THE COMMAND, GO TO "infraction.ts".
*/

export default commandModule({
  name: "Administer Infraction",
  type: ApplicationCommandType.Message,
  guildOnly: {
    condition: true,
  },
  plugins: [moderatorOnly()],
  execute: async (interaction) => {
    /**
     * Wether the message is a deletion log or normal message.
     */
    let isDelLog =
      interaction.targetMessage.channel.id ===
        config.ids.channels.statville_deletion_log &&
      interaction.targetMessage.author.id === config.ids.users.dyno;

    // Ensuring an embed exists & is valid IF del log.
    if (
      isDelLog &&
      (interaction.targetMessage.embeds.length === 0 ||
        !isValidDelLogEmbed(interaction.targetMessage.embeds[0]))
    ) {
      return interaction.reply({
        content:
          "This message does no contain a valid log embed 😔. Is it a edit message log?",
        ephemeral: true,
      });
    }

    // -------------------- Default Values --------------------- //

    let member: GuildMember | null;
    let channel: GuildTextBasedChannel;
    let msgContent: string;
    let relatedMsgLink: string;

    if (isDelLog) {
      const embed = interaction.targetMessage.embeds[0];
      const desc = embed.description!;

      // Extracting mentions.
      const authorId = extractMention(desc, "user")
        ?.replace("<@", "")
        .replace(">", "")!;
      const channelId = extractMention(desc, "channel")
        ?.replace("<#", "")
        .replace(">", "")!;
      // These^ are granteed to exist as we already checked the embed to ensure its valid.

      member = await interaction.guild.members.fetch(authorId).catch(null);
      channel = (await interaction.guild.channels
        .fetch(channelId)
        .catch(null)) as GuildTextBasedChannel;
      relatedMsgLink = interaction.targetMessage.url;

      // Checking channel exists.
      if (!channel) {
        return interaction.reply({
          content:
            "The channel this message was deleted from no longer exists 😔.",
        });
      }

      // Checking channel is text based.
      if (!channel.isTextBased()) {
        return interaction.reply({
          content:
            "This channel is not text based, I cannot give an infraction here 😔.",
          ephemeral: true,
        });
      }

      // Splitting the lines in desc to get msg content as its always below.
      // Getting index of first "\n".
      const newlineIndex = desc.indexOf("\n");
      msgContent = desc.substring(newlineIndex + 1);
      // We are doing messageContent like this so that if there are multiple "\n", any second ones are ignored.
    } else {
      // Fetching the target message member incase not already cached.
      await interaction.guild.members.fetch(
        interaction.targetMessage.author.id
      );

      member = interaction.targetMessage.member;
      channel = interaction.channel!;
      msgContent = interaction.targetMessage.content;
      relatedMsgLink = interaction.targetMessage.url;
    }

    // ---------------------- Checks ---------------------- //

    // Checking member exists.
    if (!member) {
      return interaction.reply({
        content: "That member is not in this server and therefor cannot be given an infraction ❌.",
        ephemeral: true,
      })
    }

    // Ensuring member is manageable.
    if (!member.manageable) {
      return interaction.reply({
        content:
          "It seems that member is better than me, I cannot give them an infraction 😔.",
        ephemeral: true,
      });
    }

    //------------------------------------------------------ //

    // Populating the model.
    await populateModel(
      infractionAdministerModel,
      msgContent,
      member.displayName
    );

    // Opening Model.
    await interaction.showModal(infractionAdministerModel);

    // Awaiting a response.
    let modalRes;
    try {
      modalRes = await interaction.awaitModalSubmit({
        time: 500_000,
      });
    } catch (e) {
      return;
    }

    // Extracting model values.
    const reason = modalRes.fields.getTextInputValue("reason");
    const modNotes = modalRes.fields.getTextInputValue("mod-notes");
    const publicNotes = modalRes.fields.getTextInputValue("public-notes");

    // Requesting punishment.
    // Using follow so we can respond to the deferred model interaction.
    const selectMsg = await modalRes.reply({
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>({
          components: [
            new StringSelectMenuBuilder({
              custom_id: "punishment_select",
              placeholder: "Select a punishment ⚖️.",
              options: [
                ...Object.values(InfractionPunishment).map((p) => ({
                  label: capitalize(p),
                  value: p,
                })),
                {
                  label: "None",
                  value: "none",
                },
              ],
            }),
          ],
        }),
      ],
      ephemeral: true,
      fetchReply: true, // To allow for a component collector on the message.
    });

    // Awaiting punishment response.
    const selectRes = await selectMsg.awaitMessageComponent({
      time: 200_000,
      componentType: ComponentType.StringSelect,
    });

    // Extracting punishment.
    const punishment = selectRes.values[0] as InfractionPunishment | "none";

    // Creating the var that represents if the selected punishment is temporary.
    const isTemp =
      punishment === InfractionPunishment.TempBan ||
      punishment === InfractionPunishment.Timeout;

    let durationReq: DurationRequest | null = null;

    // Requesting duration if temporary.
    if (isTemp) {
      durationReq = await requestDuration(selectRes);

      // Returning if no response submitted.
      if (!requestDuration) return;

      // Deferring the update as we will edit the original punishment select message.
      await durationReq?.interaction.deferUpdate();
    } else {
      // Deferring an update as we will edit that message.
      await selectRes.deferUpdate();
    }

    const nowDate = new Date();

    // Creating the infraction.
    const infractionDoc = new infractionModel({
      modId: interaction.user.id,
      userId: member.id,
      relatedMessageLink: relatedMsgLink,
      punishment:
        punishment === "none"
          ? undefined
          : {
              penalty: punishment,
              duration: durationReq?.duration,
              humanReadableDuration: durationReq?.humanReadable,
            },
      channelId: channel.id,
      createdAt: nowDate,
      updatedAt: nowDate,
      modNotes,
      publicNotes,
      reason,
    });

    // Administering!!!!
    await InfractionUtils.administerInfraction({
      infraction: infractionDoc,
      infractionMember: member,
      modMember: interaction.member,
    });

    // Editing original message as reply.
    await modalRes.editReply({
      embeds: [
        InfractionEmbeds.successfulInfractionAdministered(
          infractionDoc._id.toString(),
          member
        ),
      ],
      components: [],
    });
  },
});

async function populateModel(
  model: ModalBuilder,
  messageContent: string,
  authorUsername: string
) {
  // Resolving the openai client.
  const openai = await Container.getInstance().resolve("openai");

  // Pushing the current message to the AIPS.
  AIPSTraining.push({
    role: "user",
    content: `
        {
            "username": "${authorUsername}",
            "content": "${messageContent}" 
        }
    `,
  });

  // Making the request using prompt engineering.
  const res = await openai.chat.completions.create({
    messages: AIPSTraining,
    model: "gpt-3.5-turbo",
    response_format: { type: "json_object" },
  });

  // Converting to JSON.
  const resObj = JSON.parse(res.choices[0].message.content!);

  // Adding to fields.
  for (const key in resObj) {
    // Finding the field on the model.
    const field = model.components.find((c) =>
      c.components.find((c) => c.data.custom_id === key)
    );

    // Ensuring field exists.
    if (!field) continue;

    // Setting value.
    if (!resObj[key]) {
      field.components[0].data.value = "Unsure";
    } else {
      field.components[0].data.value = resObj[key];
    }
  }
}

/**
 * Checks if a deletion log embed is a valid one that we can handle.
 */
function isValidDelLogEmbed(embed: Embed): boolean {
  const userMentionRegex = /<@\d+>/; // Regular expression for user mention
  const channelMentionRegex = /<#\d+>/; // Regular expression for channel mention

  if (!embed.description) return false;

  const lines = embed.description.split("\n");

  return (
    lines.length === 2 && // Ensure the description has two lines
    lines[0].toLowerCase().includes("deleted") &&
    userMentionRegex.test(lines[0]) && // Check for at least one user mention in the second line
    channelMentionRegex.test(lines[0]) // Check for at least one channel mention in the second line
  );
}
