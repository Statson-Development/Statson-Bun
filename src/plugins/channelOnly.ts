import type { Plugin } from "neos-handler";

export default function channelOnly(channels: string[], res: string): Plugin {
  return {
    condition: (payload) =>
      payload.interaction.channel &&
      !channels.includes(payload.interaction.channel.id) &&
      payload.interaction.channel.isThread() &&
      !channels.includes(payload.interaction.channel.parentId!),
    response: () => ({
      content: res,
      ephemeral: true,
    }),
  };
}
