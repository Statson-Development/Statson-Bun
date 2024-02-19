import {
  type ModalActionRowComponentBuilder,
  ApplicationCommandOptionType,
  ChannelType,
  GuildMember,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  ChatInputCommandInteraction,
  TextInputStyle,
  ModalSubmitInteraction,
} from "discord.js";
import { commandModule } from "neos-handler";
import { readFileSync } from "fs";
import { InfractionPunishment } from "src/typescript/enums/InfractionPunishment";
import capitalize from "#utility/functions/formatting/capitalizeFirstLetter";
import {
  Infraction,
  type OmitLogLinkInfraction,
} from "#utility/schemas/infraction.model";
import InfractionUtils from "#utility/wrappers/db/infractions";
import convertHumanReadableTimeToMilliseconds from "#utility/functions/formatting/convertHumanReadableToMs";
import { Types } from "mongoose";

export default commandModule({
  name: "infraction",
  description: "The infraction command.",
  guildOnly: {
    condition: true,
    response: () => ({
      content: "This command cannot be used outside a server ❌.",
      ephemeral: true,
    }),
  },
  options: [
    {
      name: "administer",
      description:
        'Issues a cheeky warning to users, marking their "oops" moment officially 🚨.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        // REQUIRED ----------------------
        {
          name: "user",
          description: "The mischievous user in question 🎯.",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
        {
          name: "reason",
          description: "The mischief leading to this sanction 📜.",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
          aModule: {
            execute: async (int) => {
              const input = int.options.getFocused();

              return int.respond(fetchReasons(input)).catch(() => null);
            },
          },
        },

        // OPTIONAL ----------------------
        {
          name: "punishment",
          description: "The fate for this troublemaker 😈.",
          type: ApplicationCommandOptionType.String,
          choices: Object.values(InfractionPunishment).map((p) => ({
            name: capitalize(p),
            value: p,
          })),
        },
        {
          name: "channel",
          description: "The channel where the mischief unfolded 📍.",
          type: ApplicationCommandOptionType.Channel,
          channel_types: [ChannelType.GuildText],
        },
        {
          name: "message",
          description:
            "The message that sparked the infraction 📩. (please provide the link)",
          type: ApplicationCommandOptionType.String,
        },
        {
          name: "notes",
          description: "Private mod notes on the user's antics 📝.",
          type: ApplicationCommandOptionType.String,
          max_length: 1024, // To sync with the embed field limit.
        },
      ],
    },
  ],
  execute: async (interaction) => {
    switch (interaction.options.getSubcommand()) {
      case "administer": {
        const member = interaction.options.getMember("user") as GuildMember;
        const reason = interaction.options.getString("reason");
        const punishment = interaction.options.getString("punishment");
        const channel =
          interaction.options.getChannel("channel") || interaction.channel!;
        const message = interaction.options.getString("message");
        const notes = interaction.options.getString("notes");

        // Checking message is valid.
        if (message && !message.startsWith("https://discord.")) {
          // todo: this is not enough validation.
          return interaction.reply({
            content: "Invalid message link ❌.",
            ephemeral: true,
          });
        }

        // Ensuring member is manageable.
        if (!member.manageable) {
          return interaction.reply({
            content:
              "It seems that member is better than me, I cannot give them an infraction 😔.",
            ephemeral: true,
          });
        }

        // Creating the var that represents if the selected punishment is temporary.
        const isTemp =
          punishment === InfractionPunishment.TempBan ||
          punishment === InfractionPunishment.Timeout;

        // Deferring reply if its not temporary.
        if (!isTemp) {
          await interaction.deferReply();
        }

        let durationReq: DurationRequest | null = null;

        // Checking if temp punishment exists.
        if (isTemp) {
          // Requesting duration.
          durationReq = await requestDuration(interaction);

          if (!durationReq) {
            // No duration was submitted or invalid time.
            return;
          }

          // Deferring the interaction modal so we can respond later.
          await durationReq.interaction.deferUpdate();
        }

        // All interactions have been deferred here -----------------------------

        const date = new Date();
        let infraction: Infraction | OmitLogLinkInfraction = {
          _id: new Types.ObjectId(),
          modId: interaction.user.id,
          userId: member.id,
          channelId: channel.id,
          punishment: punishment
            ? {
                penalty: punishment as InfractionPunishment,
                duration: durationReq?.duration || undefined,
              }
            : undefined,
          notes: notes || undefined,
          reason: reason || undefined,
          relatedMessageLink: message || undefined,
          createdAt: date,
          updatedAt: new Date(),
        };

        // Administering.
        await InfractionUtils.administerInfraction(
          member,
          infraction as Infraction
        );

        // Using followUp() so that we can respond if the punishment is temp (and modal was used).
        await interaction.followUp({
          embeds: [],
        });

        // todo: once this is finished we need to do the other sub commands. 
        // todo: also need to do the text select command or whatever its caleled where you right click the message.
        break;
      }
    }
  },
});

/**
 * The duration request that will be returned from the requestDuration function.
 */
interface DurationRequest {
  duration: number;
  interaction: ModalSubmitInteraction;
}

/**
 * Replies to a interaction and asks for the duration of a temp punishment.
 */
async function requestDuration(
  interaction: ChatInputCommandInteraction
): Promise<null | DurationRequest> {
  // Ensuring interaction is repliable.
  if (!interaction.isRepliable()) {
    throw new Error("Interaction is not repliable.");
  }

  // Creating and showing our model.
  await interaction.showModal(
    new ModalBuilder({
      customId: "infraction-duration",
      title: "Punishment Duration",
      components: [
        new ActionRowBuilder<ModalActionRowComponentBuilder>({
          components: [
            new TextInputBuilder({
              customId: "duration",
              label: "Duration",
              style: TextInputStyle.Short,
              placeholder:
                "Duration with the time following by the letter (e.g. 1d, 2h, 3m)",
              required: true,
            }),
          ],
        }),
      ],
    })
  );

  // Awaiting a response.
  const modalRes = await interaction
    .awaitModalSubmit({
      time: 300_000,
    })
    .catch(null);

  // Ensuring modal response is valid.
  if (!modalRes) {
    return null;
  }

  try {
    const humanReadableDuration = modalRes.fields.getTextInputValue("duration");

    // Converting to ms.
    const msDuration = convertHumanReadableTimeToMilliseconds(
      humanReadableDuration
    ); // Can throw err.

    // Returning.
    return {
      duration: msDuration,
      interaction: modalRes,
    };
  } catch (e) {
    await modalRes.reply({
      content: "Invalid duration format ❌.",
      ephemeral: true,
    });
    return null;
  }
}

/**
 * Fetches a infraction reason close to the user input.
 */
function fetchReasons(input: string) {
  const path = "./autocomplete/infraction-reasons.txt";

  let reasons: string[] = JSON.parse(`${readFileSync(path)}`);
  let filteredReasons = reasons.filter((choice) =>
    choice.toLowerCase().includes(input.toLowerCase())
  );

  if (filteredReasons.length === 0) {
    return [];
  }

  return filteredReasons.slice(0, 25).map((r) => ({ name: r, value: r }));
}
