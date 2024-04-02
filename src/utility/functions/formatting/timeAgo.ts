/**
 * Converts a JavaScript Date object into a human-readable relative time string.
 *
 * This function calculates the difference between the current time and the
 * provided date, and returns a string representing this difference in a
 * human-readable format. The output can range from seconds to years, and
 * it indicates whether the date is in the past ("ago") or in the future.
 *
 * @example
 * const pastDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
 * console.log(timeAgo(pastDate)); // Output: "3 hours ago"
 *
 * const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
 * console.log(timeAgo(futureDate)); // Output: "in 5 days"
 *
 * @param date The date to be converted into a relative time string.
 * @return A string representing the relative time from the current date.
 */
export default function timeAgo(date: Date) {
  const now = new Date();
  const seconds = Math.round(Math.abs(now.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  const months = Math.round(days / 30);
  const years = Math.round(days / 365);

  function format(unit: string, value: number) {
    return `${value} ${unit}${value !== 1 ? "s" : ""} ${
      date < now ? "ago" : "from now"
    }`;
  }

  if (seconds < 60) return format("sec", seconds);
  if (minutes < 60) return format("min", minutes);
  if (hours < 24) return format("hour", hours);
  if (days < 30) return format("day", days);
  if (months < 12) return format("month", months);
  return format("year", years);
}
