/**
 * This function converts a date to the number of seconds since the Unix epoch.
 */
export default function dateToUnixSeconds(date: Date) {
    return Math.floor(date.getTime() / 1000);
}