import type { GuildMember } from "discord.js";
import type { Plugin } from "neos-handler";
import objToArr from "#utility/functions/helper/objToArr";
import config from "#config";

export default function moderatorOnly(): Plugin {
  return {
    condition: (payload) => {
      // Getting the roles that are required
      const requiredRoles = objToArr(config.ids.roles.statville_staff);

      // Now checking at least one exists.
      return !requiredRoles.some((role) =>
        (payload.interaction.member as GuildMember).roles.cache.has(role)
      );
    },
    response: () => ({
      content:
        "You do not have the required permissions to use this command ❌.",
      ephemeral: true,
    }),
  };
}
