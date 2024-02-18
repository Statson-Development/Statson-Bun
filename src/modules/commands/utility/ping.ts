import { commandModule } from "neos-handler";

export default commandModule({
  name: "ping",
  description: "A simple ping command.",
  execute: async (interaction) => {
    await interaction.reply("Pong!");
  },
});
