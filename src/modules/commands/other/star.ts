import config from "#config";
import EmbedBuilder from "#embed";
import { commandModule } from "neos-handler";
import userModel from "#utility/schemas/user.model";
import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord.js";

const userLimit = 10;

export default commandModule({
  name: "star",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "leaderboard",
      description: "View the current star leaderboard 🌟.",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "count",
      description: "View the number of stars you or a member have 🌟.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "The user you want to view the stars of 🌟.",
          type: ApplicationCommandOptionType.User,
        },
      ],
    },
  ],
  execute: async (interaction) => {
    switch (interaction.options.getSubcommand()) {
      case "leaderboard": {
        // Fetching the top 10 users with highest stars from the database.
        const userDocs = await userModel
          .find()
          .sort({ stars: -1 })
          .limit(userLimit);

        // Checking there are enough users.
        if (userDocs.length < userLimit) {
          return interaction.reply(
            "There are not enough metrics to display the leaderboard yet 🥺. Keep welcoming members!"
          );
        }

        // Creating the lb embed.
        const embed = new EmbedBuilder()
          .setAuthor({
            name: "Star Leaderboard",
            iconURL: config.urls.images.star,
          })
          .setDescription(
            userDocs
              .map(
                (user, index) =>
                  `\n**${index}. 🌟 ${user.stars}** stars | <@${user.id}>`
              )
              .join("")
          );

        await interaction.reply({
          embeds: [embed],
        });
        break;
      }

      case "count": {
        const user = interaction.options.getUser("user") || interaction.user;

        // Fetching the user from the database.
        const userDoc = await userModel.findOne({ id: user.id });

        const whoText = user.id === interaction.user.id ? "You have" : `${user.username} has`;

        // Checking the user exists.
        if(!userDoc || !userDoc.stars) {
          return interaction.reply({
            content: `${whoText} **🌟 no stars**.`,
            ephemeral: true,
          })
        }

        // Sending the stars count.
        await interaction.reply({
          content: `${whoText} collected **🌟 ${userDoc.stars} stars**.`,
        });
        break;
      }
    }
  },
});
