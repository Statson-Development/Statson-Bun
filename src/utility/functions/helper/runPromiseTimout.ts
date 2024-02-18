/**
 * This function allows us to run a promise function with a timeout.
 */
export default function runPromiseWithTimeout<T extends any[]>(
  promiseFunction: (...args: T) => Promise<any>,
  time: number,
  args: T,
  timeoutError = "Promise timed out."
) {
  return Promise.race([
    promiseFunction(...args),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), time)
    ),
  ]);
}
