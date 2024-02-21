/**
 * Generates a number between a set of two other numbers.
 */
export default function ranNum(min: number, max: number) {
  const randomDecimal = Math.random();
  let randomNumber = randomDecimal * (max - min) + min;
  return Math.round(randomNumber);
}
