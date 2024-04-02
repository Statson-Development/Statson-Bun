import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { commandModule } from "neos-handler";
import ownerOnly from "src/plugins/ownerOnly";

export default commandModule({
  name: "deletecommand",
  description: "Removes a slash command from the registry 🚫.",
  plugins: [ownerOnly()],
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "command",
      description: "The ID of the command to delete 🗑️.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  execute: async (interaction) => {
    const command = interaction.options.getString("command")!;

    // Checking if we are to delete all commands.
    if (command === "all") {
      await interaction.client.application?.commands.set([]);
      return interaction.reply({
        content: "All commands have been deleted 🗑️.",
        ephemeral: true,
      });
    }

    // Deleting the command.
    try {
      await interaction.client.application?.commands.delete(command);
    } catch (e) {
      return interaction.reply({
        content: "There was an error deleting the command ❗.",
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: "The command has been deleted 🗑️.",
      ephemeral: true,
    });
  },
});
