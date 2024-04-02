// todo: change to "ranChoice"
/**
 * Selects a random item from an array.
 * Similar to the random function in Python.
 */
export default function random(arr: Array<any>) {
  return arr[Math.floor(Math.random() * arr.length)];
}
