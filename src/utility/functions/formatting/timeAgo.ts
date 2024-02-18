/**
 * Calculates how long ago a date was and returns a human-readable string.
 * 
 * @param date The date to compare with the current date.
 * in terms of minutes, hours, days, months, or years. Does not handle 
 * durations longer than years.
 */
export default function timeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
    let interval = seconds / 31536000; // Number of seconds in a year
  
    if (interval > 1) {
      return `${Math.floor(interval)} years ago`;
    }
    interval = seconds / 2592000; // Number of seconds in a month
    if (interval > 1) {
      return `${Math.floor(interval)} months ago`;
    }
    interval = seconds / 86400; // Number of seconds in a day
    if (interval > 1) {
      return `${Math.floor(interval)} days ago`;
    }
    interval = seconds / 3600; // Number of seconds in an hour
    if (interval > 1) {
      return `${Math.floor(interval)} hours ago`;
    }
    interval = seconds / 60; // Number of seconds in a minute
    if (interval > 1) {
      return `${Math.floor(interval)} minutes ago`;
    }
    return "Just now";
  }