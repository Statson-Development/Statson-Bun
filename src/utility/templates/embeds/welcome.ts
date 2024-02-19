import type { GuildMember } from "discord.js";
import EmbedBuilder from "./default";
import random from "#utility/functions/helper/random";
import config from "#config";

export default class WelcomeEmbed extends EmbedBuilder {
  constructor(member: GuildMember) {
    super();

    // Setting the attributes.
    this.setFooter(
      Math.floor(Math.random() * 4) === 1
        ? {
            iconURL:
              "https://cdn.streamersonglist.com/kisspng-incandescent-light-bulb-emoji-led-lamp-symbol-5aff6eb3f3aaf8.7281496115266894599981-2754-1577907392195.png",
            text: "Tip: Reply 'welcome' within 2 mins for a star! ⭐",
          }
        : {
            text: `There are now ${member.guild.memberCount} Statizens!`,
          }
    )
      .setAuthor({
        name: member.displayName,
        iconURL: member.user.displayAvatarURL(),
      })
      .setTitle("Welcome To Statville!")
      .setDescription(
        `${member}, just joined. Be sure to give them a 🌟 **Warm "Welcome"** 🌟!`
      )
      .setThumbnail(member.displayAvatarURL())
      .setImage(random(config.urls.images.welcome));
  }
}
