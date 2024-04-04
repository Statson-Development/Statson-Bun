import { commandModule } from "neos-handler";
import moderatorOnly from "../../../plugins/moderatorOnly";
import { InfractionPunishment } from "../../../typescript/enums/InfractionPunishment";
import {
  ChannelType,
  ModalBuilder,
  TextInputStyle,
  ActionRowBuilder,
  TextInputBuilder,
  type Interaction,
  ModalSubmitInteraction,
  ApplicationCommandType,
  ApplicationCommandOptionType,
  type ModalActionRowComponentBuilder,
} from "discord.js";
import config from "#config";
import timeAgo from "#utility/functions/formatting/timeAgo";
import EmbedBuilder from "#utility/templates/embeds/default";
import InfractionUtils from "#utility/wrappers/both/infractions";
import PaginationHelper from "#utility/classes/PaginationHelper";
import infractionEmbedUtils from "#utility/templates/embeds/infractions";
import capitalize from "#utility/functions/formatting/capitalizeFirstLetter";
import infractionModel, { Infraction } from "#utility/schemas/infraction.model";
import convertHumanReadableTimeToMilliseconds from "#utility/functions/formatting/convertHumanReadableToMs";

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
  plugins: [moderatorOnly()],
  type: ApplicationCommandType.ChatInput,
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

              const reasons = await fetchReasons(input);

              return int.respond(reasons).catch(() => null);
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
          channel_types: [ChannelType.GuildText], // todo: this should be changed to any
        },
        {
          name: "message",
          description:
            "The message that sparked the infraction 📩. (please provide the link)",
          type: ApplicationCommandOptionType.String,
        },
        {
          name: "mod-notes",
          description: "Private mod notes on the user's antics 📝.",
          type: ApplicationCommandOptionType.String,
          max_length: 1024, // To sync with the embed field limit.
        },
        {
          name: "public-notes",
          description: "Public notes that the user can view 📝.",
          type: ApplicationCommandOptionType.String,
          max_length: 1024, // To sync with the embed field limit.
        },
      ],
    },
    {
      name: "delete",
      description: "Removes a user's infraction record from the database 🗃️.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "id",
          description: "The unique identifier of the infraction 🔑.",
          type: ApplicationCommandOptionType.String,
          min_length: 15,
          max_length: 35,
          required: true,
        },
      ],
    },
    {
      name: "fetch",
      description: "Fetches a user's infraction record from the database 🗃️.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "id",
          description: "The unique identifier of the infraction 🔑.",
          type: ApplicationCommandOptionType.String,
          min_length: 15,
          max_length: 35,
          required: true,
        },
      ],
    },
    {
      name: "change-punishment",
      description: "Changes an infractions punishment 🚫.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "id",
          description: "The unique identifier of the infraction 🔑.",
          type: ApplicationCommandOptionType.String,
          min_length: 15,
          max_length: 35,
          required: true,
        },
        {
          name: "punishment",
          description: "The new punishment for the infraction 🚫.",
          type: ApplicationCommandOptionType.String,
          choices: [
            ...Object.values(InfractionPunishment).map((p) => ({
              name: capitalize(p),
              value: p,
            })),
            {
              name: "None",
              value: "none",
            },
          ],
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "Lists all infractions for a user 📜.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "The user to list infractions for 🎯.",
          type: ApplicationCommandOptionType.User,
          required: true,
        },
      ],
    },
  ],
  execute: async (interaction) => {
    switch (interaction.options.getSubcommand()) {
      case "administer": {
        const member = interaction.options.getMember("user")!;
        const reason = interaction.options.getString("reason");
        const punishment = interaction.options.getString("punishment");
        const channel =
          interaction.options.getChannel("channel") || interaction.channel!;
        const message = interaction.options.getString("message");
        const modNotes = interaction.options.getString("mod-notes");
        const publicNotes = interaction.options.getString("public-notes");

        // Checking message is valid.
        if (message && !message.startsWith("https://discord.")) {
          // todo: this is not enough validation.
          return interaction.reply({
            content: "Invalid message link ❌.",
            ephemeral: true,
          });
        }

        // Checking member exists.
        if (!member) {
          return interaction.reply({
            content:
              "That member is not in this server and therefor cannot be given an infraction ❌.",
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

        // Checking if the user is trying to punish themselves.
        if (interaction.user.id === member.id) {
          return interaction.reply({
            content: "Wait... I don't think you should be able to do that 🤔!",
            ephemeral: true,
          });
        }

        // Creating the var that represents if the selected punishment is temporary.
        const isTemp =
          punishment === InfractionPunishment.TempBan ||
          punishment === InfractionPunishment.Timeout;

        // Deferring reply if its not temporary.
        if (!isTemp) {
          await interaction.deferReply({
            ephemeral: true,
          });
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

        // Creating the infraction.
        const nowDate = new Date();
        const infraction = new infractionModel({
          modId: interaction.user.id,
          userId: member.id,
          channelId: channel.id,
          punishment: punishment
            ? {
                penalty: punishment as InfractionPunishment,
                duration: durationReq?.duration || undefined,
                humanReadableDuration: durationReq?.humanReadable || undefined,
              }
            : undefined,
          reason: reason || undefined,
          relatedMessageLink: message || undefined,
          createdAt: nowDate,
          updatedAt: nowDate,
          modNotes,
          publicNotes,
        });

        // Administering.
        await InfractionUtils.administerInfraction({
          modMember: interaction.member,
          infractionMember: member,
          infraction,
        });

        // Using followUp() so that we can respond if the punishment is temp (and modal was used).
        await interaction.followUp({
          embeds: [
            infractionEmbedUtils.successfulInfractionAdministered(
              infraction._id.toString(),
              member
            ),
          ],
        });
        break;
      }

      case "delete": {
        // Ensuring member is has admin.
        if (!interaction.member.permissions.has("Administrator")) {
          return interaction.reply({
            content:
              "Mods cannot use this command you cheeky little tomato 🍅.",
            ephemeral: true,
          });
        }

        const id = interaction.options.getString("id");

        // Fetching infraction from db.
        const infractionDoc = await infractionModel.findOne({ _id: id });

        // Checking if infraction exists.
        if (!infractionDoc) {
          return interaction.reply({
            content: "Infraction not found ❌.",
            ephemeral: true,
          });
        }

        // Deleting infraction.
        await infractionDoc.deleteOne();

        // Replying to the message.
        await interaction.reply({
          content: "Infraction deleted successfully ✅.",
          ephemeral: true,
        });
        break;
      }

      case "fetch": {
        const id = interaction.options.getString("id");

        // Fetching infraction from db.
        const infractionDoc = await infractionModel.findOne({ _id: id });

        // Checking doc existence.
        if (!infractionDoc) {
          return interaction.reply({
            content: "I cannot find that infraction ❌.",
            ephemeral: true,
          });
        }

        // Converting the infraction to an embed.
        const embed = await infractionEmbedUtils.newInfractionLogEmbed(
          infractionDoc
        );

        // Replying.
        await interaction.reply({
          embeds: [embed],
        });
        break;
      }

      case "change-punishment": {
        // Checking if member is admin.
        if (!interaction.member.permissions.has("Administrator")) {
          return interaction.reply({
            content:
              "Mods cannot use this command you cheeky little tomato 🍅.",
            ephemeral: true,
          });
        }

        const id = interaction.options.getString("id");

        // Fetching infraction from db.
        const infractionDoc = await infractionModel.findOne({ _id: id });

        // Checking doc existence.
        if (!infractionDoc) {
          return interaction.reply({
            content: "I cannot find that infraction ❌.",
            ephemeral: true,
          });
        }

        const newPunishment = interaction.options.getString("punishment") as
          | InfractionPunishment
          | "none";

        // Ensuring punishment can be changed.
        if (infractionDoc.punishment) {
          const invalidTransitions = [
            { from: InfractionPunishment.Ban, to: InfractionPunishment.Kick },
            {
              from: InfractionPunishment.Ban,
              to: InfractionPunishment.Timeout,
            },
            {
              from: InfractionPunishment.TempBan,
              to: InfractionPunishment.Kick,
            },
            {
              from: InfractionPunishment.TempBan,
              to: InfractionPunishment.Timeout,
            },
            {
              from: InfractionPunishment.Kick,
              to: InfractionPunishment.Timeout,
            },
          ];

          // If the transition is invalid, return
          if (
            invalidTransitions.some(
              (transition) =>
                infractionDoc.punishment?.penalty === transition.from &&
                newPunishment === transition.to
            )
          ) {
            return interaction.reply({
              content: `I cannot change the punishment from \`${infractionDoc.punishment?.penalty}\` to \`${newPunishment}\``,
              ephemeral: true,
            });
          }
        }

        // Fetching duration if needed.
        const isTemp =
          newPunishment === InfractionPunishment.TempBan ||
          newPunishment === InfractionPunishment.Timeout;

        // Deferring reply if its not temporary.
        if (!isTemp) {
          await interaction.deferReply({
            ephemeral: true,
          });
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

        // All interactions are deferred here.

        // Changing the punishment.
        await InfractionUtils.changeInfractionPunishment(
          infractionDoc,
          newPunishment === "none"
            ? null
            : {
                penalty: newPunishment,
                duration: durationReq?.duration,
                humanReadableDuration: durationReq?.humanReadable,
              },
          interaction.user.id,
          interaction.guildId
        );

        // Replying.
        await interaction.followUp({
          embeds: [
            new EmbedBuilder(interaction.member)
              .setTitle("Punishment Changed")
              .setDescription(
                `\`✅\` - Successfully changed infraction punishment to \`${newPunishment}\`.`
              )
              .setFooter({
                text: `%%${infractionDoc._id}%%`, // %% to stop auto formatting.
                iconURL: config.urls.images.id,
              }),
          ],
        });
        break;
      }

      case "list": {
        const user = interaction.options.getUser("user")!;

        // Fetching all infractions for the user.
        const infractionDocs = await infractionModel.find({ userId: user.id });

        // Checking some exist.
        if (infractionDocs.length === 0) {
          await interaction.reply({
            content: `No infractions found for ${user} ❌.`,
            ephemeral: true,
          });
        }

        // Counting users infractions to categorize into a time.
        const infractionCount = countRecentInfractions(infractionDocs);

        // The list of previous infractions.
        let previousInfractionDisplay =
          infractionDocs.map(
            (infraction) =>
              `\n[\`🔗 – ${timeAgo(infraction.createdAt!)} - ${
                infraction.reason
              }\`](%%${infraction.logLink}%%)`
          ) || [];

        // Ensuring field is not to long.
        while (previousInfractionDisplay.join("").length > 1024) {
          previousInfractionDisplay.pop();
        }

        // Creating the embeds.
        const embeds = [
          new EmbedBuilder()
            .setAuthor({
              name: `${user.displayName}'s Infractions`,
              iconURL: user.displayAvatarURL(),
            })
            .addFields(
              {
                name: "Last 24 Hours",
                value: `${infractionCount.last24Hours} infractions`,
                inline: true,
              },
              {
                name: "Last 7 Days",
                value: `${infractionCount.last7Days} infractions`,
                inline: true,
              },
              {
                name: "All Time",
                value: `${infractionCount.total} infractions`,
                inline: true,
              },
              {
                name: "Infraction List",
                value:
                  previousInfractionDisplay.length === 0
                    ? "None"
                    : previousInfractionDisplay.join(""),
              }
            ),
          ...infractionDocs.map((infraction) =>
            infractionEmbedUtils.newInfractionLogEmbed(infraction)
          ),
        ];

        // Ensuring all promises have resolved (the create infraction function is promise based).
        await Promise.all(embeds);

        await new PaginationHelper(
          interaction,
          embeds as EmbedBuilder[]
        ).paginate();
        break;
      }
    }
  },
});

/**
 * The duration request that will be returned from the requestDuration function.
 */
export interface DurationRequest {
  duration: number;
  humanReadable: string;
  interaction: ModalSubmitInteraction;
}

/**
 * Replies to a interaction and asks for the duration of a temp punishment.
 */
export async function requestDuration(
  interaction: Interaction
): Promise<null | DurationRequest> {
  // Ensuring we can show a model.
  if (interaction.isModalSubmit() || interaction.isAutocomplete()) {
    throw new Error("Model cannot be shown on that type of interaction.");
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
      humanReadable: humanReadableDuration,
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
async function fetchReasons(input: string) {
  const path = "./autocomplete/infraction-reasons.json";

  const file = Bun.file(path);

  let reasons: string[] = await file.json();
  let filteredReasons = reasons.filter((choice) =>
    choice.toLowerCase().includes(input.toLowerCase())
  );

  if (filteredReasons.length === 0) {
    return [];
  }

  return filteredReasons.slice(0, 25).map((r) => ({ name: r, value: r }));
}

function countRecentInfractions(infractions: Array<Infraction>) {
  const now = new Date().getTime();

  let last24HoursCount = 0;
  let last7DaysCount = 0;
  let totalCount = infractions.length;

  for (let infraction of infractions) {
    const activityDate = infraction.createdAt!.getTime();
    const timeDiff = now - activityDate;
    const timeDiffInHours = timeDiff / (1000 * 60 * 60);
    const timeDiffInDays = timeDiffInHours / 24;

    if (timeDiffInHours <= 24) {
      last24HoursCount++;
    }

    if (timeDiffInDays <= 7) {
      last7DaysCount++;
    }
  }

  return {
    last24Hours: last24HoursCount,
    last7Days: last7DaysCount,
    total: totalCount,
  };
}
