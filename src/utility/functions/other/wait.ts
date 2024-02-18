/**
 * Wait for a certain amount of time.
 */
export function wait(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
