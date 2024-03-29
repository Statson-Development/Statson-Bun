import { ApplicationCommandOptionType, GuildMember } from "discord.js";
import { commandModule } from "neos-handler";

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
    const member = interaction.options.getMember("user") || interaction.member;

    // Emitting the event.
    interaction.client.emit("guildMemberAdd", member);

    // Responding.
    await interaction.reply({
      content: `Welcomed ${member}!`,
      ephemeral: true,
    });
  },
});
