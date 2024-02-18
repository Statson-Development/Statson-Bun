/**
 * Utility type to extract only the properties (excluding methods) of a class
 */
export type PropOnly<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
