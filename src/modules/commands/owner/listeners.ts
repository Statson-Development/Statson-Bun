import { commandModule } from "neos-handler";
import ownerOnly from "src/plugins/ownerOnly";
import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord.js";

export default commandModule({
  name: "listeners",
  description: "Checks how many listeners exist on the client 👂.",
  type: ApplicationCommandType.ChatInput,
  plugins: [ownerOnly()],
  options: [
    {
      name: "listener",
      description: "The listener to check.",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ],
  execute: async (interaction) => {
    const listener = interaction.options.getString("listener")!;
    await interaction.reply(
      `There are \`${interaction.client.listenerCount(
        listener
      )}\` listeners on the \`${listener}\` event.`
    );
  },
});
