import userModel from "#utility/schemas/user.model";
import EmbedBuilder from "#utility/templates/embeds/default";
import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import { commandModule } from "neos-handler";

export default commandModule({
  name: "balance",
  description: "todo",
  guildOnly: {
    condition: true,
  },
  options: [
    {
      name: "user",
      description: "todo",
      type: ApplicationCommandOptionType.User,
    },
  ],
  execute: async (interaction) => {
    const member = (interaction.options.getMember("user") ||
      interaction.member) as GuildMember;

    // Fetching the user from db.
    const userDoc = await userModel.findOne({
      id: member.id,
    });

    await interaction.reply({
      embeds: [
        new EmbedBuilder(member).setDescription(
          `${
            member.id === interaction.user.id ? "Your" : `${member.toString}'s`
          } balance is **${Bun.env.CURRENCY_EMOJI} ${
            userDoc?.money || Bun.env.STARTING_BALANCE
          }  ${Bun.env.CURRENCY_TEXT}**`
        ),
      ],
    });
  },
});
