/**
 * Takes a number and returns it in a short string format.
 */
export default function formatNumberAsShortString(n: number): string {
  if (n < 1000) {
    return n.toString();
  } else if (n < 10000) {
    return (n / 1000).toFixed(1) + "k";
  } else {
    return (n / 1000).toFixed(1) + "k";
  }
}
