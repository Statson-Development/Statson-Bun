import config from "#config";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default function authorizeInfractionPunishment(punishment: string) {
  return new ActionRowBuilder<ButtonBuilder>({
    components: [
      new ButtonBuilder({
        custom_id: "authorize_infraction_punishment",
        label: `Authorize ${punishment}`,
        emoji: config.emojis.ban_hammer,
        style: ButtonStyle.Secondary,
      }),
    ],
  });
}
