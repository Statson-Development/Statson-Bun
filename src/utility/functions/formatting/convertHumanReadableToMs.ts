/**
 * Converts human-readable time into milliseconds.
 *
 * This function accepts a string input representing time in a human-readable format
 * and converts it into the equivalent number of milliseconds. The input format
 * should follow the pattern `{length}{unit}`, where `{length}` is a positive integer
 * and `{unit}` is a single character representing the time unit.
 *
 * Supported time units are:
 * - 'm' for minutes
 * - 'h' for hours
 * - 'd' for days
 * - 'w' for weeks
 *
 * @example
 * "15m" converts to 900,000 milliseconds (15 minutes)
 * "2h" converts to 7,200,000 milliseconds (2 hours)
 * "5d" converts to 432,000,000 milliseconds (5 days)
 * "1w" converts to 604,800,000 milliseconds (1 week)
 *
 * @param {string} input The human-readable time string to be converted.
 * @return {number} The equivalent time in milliseconds.
 * @throws {Error} Throws an error if the input format is invalid or uses an unsupported time unit.
 *
 * GPT ahh docs.
 */
export default function convertHumanReadableTimeToMilliseconds(
  input: string
): number {
  // Define conversion factors to milliseconds
  const conversionFactors: { [unit: string]: number } = {
    m: 60 * 1000, // 1 minute = 60,000 milliseconds
    h: 60 * 60 * 1000, // 1 hour = 3,600,000 milliseconds
    d: 24 * 60 * 60 * 1000, // 1 day = 86,400,000 milliseconds
    w: 7 * 24 * 60 * 60 * 1000, // 1 week = 604,800,000 milliseconds
  };

  // Extract the numeric part and the unit
  const match = input.match(/^(\d+)([mhdw])$/);
  if (!match) {
    throw new Error("Invalid input format");
  }

  const length = parseInt(match[1], 10);
  const unit = match[2];

  // Calculate and return the number of milliseconds
  const factor = conversionFactors[unit];
  if (!factor) {
    throw new Error("Invalid time unit");
  }

  return length * factor;
}
