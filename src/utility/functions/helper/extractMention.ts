/**
 * Extracts a user or channel mention from a string.
 *
 * @param text The string to search for a mention.
 * @param type The type of mention to extract ('user' or 'channel').
 * @returns The extracted mention as a string, or null if no mention is found.
 */
export default function extractMention(
  text: string,
  type: "user" | "channel"
): string | null {
  const userMentionRegex = /<@!?(\d+)>/; // Regular expression for user mention
  const channelMentionRegex = /<#(\d+)>/; // Regular expression for channel mention

  let regex = type === "user" ? userMentionRegex : channelMentionRegex;
  let match = text.match(regex);

  return match ? match[0] : null;
}
