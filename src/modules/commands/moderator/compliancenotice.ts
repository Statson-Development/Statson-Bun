import config from "#config";
import EmbedBuilder from "#embed";
import { commandModule } from "neos-handler";
import moderatorOnly from "src/plugins/moderatorOnly";
import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
} from "discord.js";
import LogUtils from "../../../utility/wrappers/discord/loggers";

export default commandModule({
  name: "compliancenotice",
  description:
    "Send a notice to users to align their profiles with our server guidelines 🛠️.",
  type: ApplicationCommandType.ChatInput,
  plugins: [moderatorOnly()],
  options: [
    {
      name: "user",
      description: "The user in violation 📜.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
    {
      name: "in-violation",
      description: "The part of their profile that is in violation 🚫.",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "Username",
          value: "username",
        },
        {
          name: "Picture",
          value: "picture",
        },
        {
          name: "Pronouns",
          value: "pronouns",
        },
        {
          name: "Bio",
          value: "bio",
        },
      ],
    },
  ],
  execute: async (interaction) => {
    const member = interaction.options.getMember("user")!;
    const inViolation = interaction.options.getString("in-violation")!

    // Sending message to member.
    await member.send({
      embeds: [
        new EmbedBuilder(member)
          .setTitle("Compliance Notice")
          .setDescription(
            `
                 Hey ${member}, we've noticed that your profile may be **in violation of our <#${config.ids.channels.statville_rules}> or [Discords TOS](${config.urls.websites.discord_tos})**. 

                 Please align your profile within \`15 minutes\` to avoid possible exclusion from our server 🙌.

                 *If you have any questions, feel free to contact staff using <@${config.ids.users.modmail}>.*
                `
          )
          .setFields({
            name: "Section In Violation:",
            value: `\`${inViolation}\``,
          })
          .setImage(config.urls.images.statville_server_banner),
      ],
    });

    // Replying to interaction.
    await interaction.reply({
        content: `Compliance notice sent to ${member} 📬! I will remind you in \`15 minutes\` to check if the issue has been resolved ✅.`,
        ephemeral: true
    });

    // Logging in infraction log.
    const log = await LogUtils.log(config.ids.channels.statville_infractions_logging, {
        embeds: [
            new EmbedBuilder()
            .setDescription(`:info: - Compliance notice sent to ${member} regarding their \`${inViolation}\`.`)
        ]
    })
    
    // Setting a timeout for 15 mins to remind mod to check issue has been changed.
    setTimeout(async () => {
        await log.reply({
            content: `${interaction.user}, please check if the issue has been resolved by ${member} 🕵️.`
        })
    }, 900_000)
  },
});
