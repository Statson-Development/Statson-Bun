/**
 * This function takes an object and will output an array of all of the values in the object.
 */
export default function objToArr<T>(obj: Record<string, T>): T[] {
  return Object.keys(obj).map((key) => obj[key]);
}
