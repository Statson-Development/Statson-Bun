/**
 * Extracts the message ID from a Discord link.
 *
 * @param link The Discord link to extract the message ID from.
 * @returns The extracted message ID, or null if the link does not match the expected format.
 */
export default function extractIdFromDLink(link: string): string | null {
  const regex = /https:\/\/discord\.com\/channels\/\d+\/\d+\/(\d+)/;
  const match = link.match(regex);
  return match ? match[1] : null;
}
