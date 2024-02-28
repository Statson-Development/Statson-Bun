import type { IncludedPluginResponses } from "neos-handler";
import ErrorEmbed from "../embeds/error";
import random from "#utility/functions/helper/random";
import config from "#config";

export default {
  missingBotPermission: (perms) => ({
    // todo: this should get payload... and types are wrong.
    embeds: [
      new ErrorEmbed()
        .setTitle("Permission Error")
        .setDescription(
          `I need the following permissions to run this command: ${perms
            .map((perm) => `- \`${perm}\`\n`)
            .join("")}`
        ),
    ],
    ephemeral: true,
  }),
  onCooldown: (remainingTime) => ({
    embeds: [
      new ErrorEmbed()
        .setTitle("Cooldown Error")
        .setDescription(
          `*${random(config.responses.on_cooldown)}*` +
            `\n### Time Remaining 🕛 \n> \`${remainingTime}\``
        ),
    ],
    ephemeral: true,
  }),
} as IncludedPluginResponses;
