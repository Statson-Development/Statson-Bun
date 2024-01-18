/**
 * Formats some nanosecond time into following format:
 * {time}{time identity (hours/seconds/etc)}
 */
export function formatNanosecondsToHumanTime(time: bigint): string {
  const nsPerSecond = 1000000000n; // 1 second in nanoseconds
  const nsPerMinute = 60n * nsPerSecond; // 1 minute in nanoseconds
  const nsPerHour = 60n * nsPerMinute; // 1 hour in nanoseconds
  const nsPerMillisecond = 1000000n; // 1 millisecond in nanoseconds

  if (time >= nsPerHour) {
    return `${(Number(time) / Number(nsPerHour)).toFixed(2)} hours`;
  } else if (time >= nsPerMinute) {
    return `${(Number(time) / Number(nsPerMinute)).toFixed(2)} minutes`;
  } else if (time >= nsPerSecond) {
    return `${(Number(time) / Number(nsPerSecond)).toFixed(2)} seconds`;
  } else if (time >= nsPerMillisecond) {
    return `${(Number(time) / Number(nsPerMillisecond)).toFixed(
      2
    )} milliseconds`;
  } else {
    return `${time} nanoseconds`;
  }
}
/**
 * Formats some milisecond time into the following format:
 * {days} {hours} {mins} {secs}
 */
export function formatMillisecondsToDuration(time: number) {
  const timeInSeconds = Number(time) * 1000;
  const seconds = Math.floor(timeInSeconds % 60);
  const minutes = Math.floor((timeInSeconds / 60) % 60);
  const hours = Math.floor((timeInSeconds / 3600) % 24);
  const days = Math.floor(timeInSeconds / 86400);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
