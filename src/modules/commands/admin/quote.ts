import quoteModel from "#utility/schemas/quote.model";
import { ApplicationCommandOptionType } from "discord.js";
import { commandModule } from "neos-handler";

export default commandModule({
  name: "quote",
  description: "Allows editing of quotes.",
  userPermissions: {
    condition: ["Administrator"],
  },
  options: [
    {
      name: "create",
      description: "Creates a new quote 💬.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "content",
          description: "The description of the quote 📝.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "delete",
      description: "Deletes a quote 💬.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "content",
          description: "The content of the quote 📝.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  execute: async (interaction) => {
    // Content exists on all sub commands.
    const content = interaction.options.getString("content")!;

    // Switching through sub cmds.
    switch (interaction.options.getSubcommand()) {
      case "create": {
        // Adding the quote to the database.
        try {
          await quoteModel.create({
            authorId: interaction.user.id,
            content,
          });
        } catch (e) {
          // Catching any errors.
          return interaction.reply({
            content: "An error occurred, the quote likely already exists 😥.",
            ephemeral: true,
          });
        }

        // Replying.
        await interaction.reply(`I have created quote: \`${content}\``);
        break;
      }
      case "delete": {
        // Deleting from the database.
        try {
          await quoteModel.deleteOne({ content });
        } catch (e) {
          return interaction.reply({
            content: "An error occurred, the quote likely does not exist 😥.",
            ephemeral: true,
          });
        }

        // Replying.
        await interaction.reply(`I have deleted quote: \`${content}\``);
        break;
      }
    }
  },
});
