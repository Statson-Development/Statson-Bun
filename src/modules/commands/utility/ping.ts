import EmbedBuilder from "#utility/templates/embeds/default";
import { ApplicationCommandType } from "discord.js";
import { commandModule } from "neos-handler";

export default commandModule({
  name: "ping",
  description: "A simple ping command 🏓.",
  type: ApplicationCommandType.ChatInput,
  execute: async (interaction) => {
    const num = Math.floor(Math.random() * 50);

    const embed = new EmbedBuilder(interaction.member);
    embed.setDescription(`**Pong 🏓!** - \`${interaction.client.ws.ping}ms\``);

    if (num === 25) {
      await interaction.reply(
        "https://tenor.com/view/chiro-kadasj-kadasj-chelle-ping-pong-lets-play-gif-17306125"
      );
    } else {
      await interaction.reply({
        embeds: [embed],
      });
    }
  },
});
