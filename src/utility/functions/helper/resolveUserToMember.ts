import type { GuildMember, User } from "discord.js";
import { Container } from "neos-container";
import config from "#config";

/**
 *
 * @param user The user to resolve from.
 * @param guildId The guild to fetch the member from. If none is specified it will default to statville.
 */
export default async function resolveUserToMember(
  user: User,
  guildId?: string
): Promise<GuildMember | null> {
  // Getting the client.
  const client = await Container.getInstance().resolve("@internal/client");

  // Ensuring client existence.
  if (!client) {
    throw new Error("Cannot resolve client.");
  }

  // Resolving the guild.
  const guild = await client.guilds.fetch(config.ids.guilds.statville);

  // Ensuring guild existence.
  if (!guild) {
    throw new Error("Cannot resolve guild.");
  }

  // Resolving the member.
  return (await guild.members.fetch(user.id)) || null; // todo: this will throw error if not come
}
