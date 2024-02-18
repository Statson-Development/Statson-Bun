import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import { commandModule } from "neos-handler";
import { welcomeMember } from "src/modules/events/discord/guildMemberAdd";

export default commandModule({
  name: "welcomemember",
  description: "Used to test the greeting system 🚀.",
  guildOnly: {
    condition: true,
  },
  userPermissions: {
    condition: ["ManageGuild"],
  },
  botPermissions: {
    condition: ["SendMessages"],
  },
  options: [
    {
      name: "user",
      description: "The user to welcome.",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ],
  execute: async (interaction) => {
    // Defining the member to welcome.
    const member = (interaction.options.getMember("user") ||
      interaction.member) as GuildMember;

    // Calling the welcome member func.
    await welcomeMember(member);

    // Responding.
    await interaction.reply({
      content: `Sent in <#${Bun.env.STATVILLE_GENERAL_CHANNEL_ID}>!`,
      ephemeral: true,
    });
  },
});
