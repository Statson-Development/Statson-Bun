import type { GuildTextBasedChannel, MessageCreateOptions } from "discord.js";
import { Bot } from "neos-handler";

export enum LogLocation {
    STAFF = "1197408858390401051",
    INFRACTIONS = "1197408858809839685"
}

async function log(location: LogLocation, options: MessageCreateOptions) {
    // Resolving client.
    const client = await Bot.getInstance().container.resolve("@internal/client");

    // Getting the channel to send to.
    let channel = await client.channels.fetch(location) as GuildTextBasedChannel;

    return channel.send(options);
}

export default {
    LogLocation,
    log
}