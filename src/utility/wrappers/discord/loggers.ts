import { Bot } from "neos-handler";
import type {
  Channel,
  Message,
  MessageEditOptions,
  MessageCreateOptions,
  GuildTextBasedChannel,
} from "discord.js";

async function log(locationId: string, options: MessageCreateOptions) {
  // Resolving client.
  const client = await Bot.getInstance().container.resolve("@internal/client");

  // Getting the channel to send to.
  let channel = (await client.channels.fetch(
    locationId
  )) as GuildTextBasedChannel;

  return channel.send(options);
}

async function editLog(
  channel: Channel | string,
  message: Message | string,
  editOptions: MessageEditOptions
) {
  // Resolving client.
  const client = await Bot.getInstance().container.resolve("@internal/client");

  try {
    // Ensuring channel is resolved.
    if (typeof channel === "string") {
      const resolvedChannel = await client.channels.fetch(channel);

      if (!resolvedChannel) {
        throw new Error("Cannot resolve channel.");
      }

      if (!resolvedChannel.isTextBased()) {
        throw new Error("Channel is not text based.");
      }

      channel = resolvedChannel;
    }

    // Ensuring message is resolved.
    if (typeof message === "string") {
      message = await (channel as GuildTextBasedChannel).messages.fetch(
        message
      );
    }
  } catch (e) {
    throw new Error(`Error resolving channel or message: ${e}`);
  }

  return message.edit(editOptions);
}

export default {
  log,
  editLog,
};
