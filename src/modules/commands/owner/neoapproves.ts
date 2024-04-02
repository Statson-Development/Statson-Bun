import EmbedBuilder from "#utility/templates/embeds/default";
import { ApplicationCommandType } from "discord.js";
import { commandModule } from "neos-handler";
import ownerOnly from "src/plugins/ownerOnly";

export default commandModule({
  name: "neoapproves",
  description: "Neo approves your message 👍!",
  type: ApplicationCommandType.ChatInput,
  plugins: [ownerOnly()],
  userPermissions: {
    condition: ["Administrator"],
  },
  execute: async (interaction) => {
    await interaction.reply({
      embeds: [
        new EmbedBuilder().setImage("https://i.ibb.co/c81vvX6/neoapproves.png"),
      ],
    });
  },
});
