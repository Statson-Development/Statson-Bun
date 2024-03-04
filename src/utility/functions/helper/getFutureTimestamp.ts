import { Timestamp } from "#utility/classes/Timestamp";

/**
 * Returns what the unix timestamp will be in a provided amount of seconds.
 */
export default function getFutureTimestamp(seconds: number) {
  const now = new Date();
  const futureTime = now.getTime() + seconds * 1000;
  return new Timestamp(futureTime);
}
