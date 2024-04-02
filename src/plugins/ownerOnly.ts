import type { Plugin } from "neos-handler";
import config from "#config";

export default function ownerOnly(): Plugin {
  return {
    condition: (payload) =>
      !config.ids.users.owners.includes(payload.interaction.user.id),
    response: () => ({
      content: "You cannot use that command ❌.",
      ephemeral: true,
    }),
  };
}
