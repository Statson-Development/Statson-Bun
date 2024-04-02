import { eventModule } from "neos-handler";

export default eventModule({
  emitter: "@internal/client",
  name: "messageCreate",
  execute: async (message) => {
    // Disabled on dev mode.
    // if (Bun.env.NODE_ENV === "development") return;

    // Returning if bot.
    if (message.author.bot) return;

    // Converting to lowercase.
    const lowerContent = message.content.toLowerCase();

    // Ignoring if "degrees" is not found.
    if (!(lowerContent.includes("degrees") || lowerContent.includes("°")))
      return;
    // Returning if both forms of measurement are detected.
    if (lowerContent.includes("celsius") && lowerContent.includes("fahrenheit"))
      return;

    // Converting temp.
    const convertedTemp = convertTemperature(lowerContent);

    if (!convertedTemp) return;

    // Replying with the converted temp.
    await message.reply(
      `\`(${convertedTemp.temp}°${convertedTemp.measurement
        .charAt(0)
        .toUpperCase()} ${getTemperatureEmoji(
        convertedTemp.temp,
        convertedTemp.measurement
      )})\``
    );
  },
});

function getTemperatureEmoji(temp: number, measurement: string) {
  let threshold = {
    celsius: { cold: 18, warm: 20, hot: 30 },
    fahrenheit: { cold: 64, warm: 68, hot: 86 },
  };

  let emojiMap = {
    cold: "🥶",
    warm: "😊",
    hot: "🥵",
  };

  let temperatureCategory;

  switch (measurement.toLowerCase()) {
    case "celsius":
      if (temp <= threshold.celsius.cold) {
        temperatureCategory = "cold";
      } else if (temp >= threshold.celsius.hot) {
        temperatureCategory = "hot";
      } else {
        temperatureCategory = "warm";
      }
      break;
    case "fahrenheit":
      if (temp <= threshold.fahrenheit.cold) {
        temperatureCategory = "cold";
      } else if (temp >= threshold.fahrenheit.hot) {
        temperatureCategory = "hot";
      } else {
        temperatureCategory = "warm";
      }
      break;
    default:
      return "Invalid measurement unit";
  }

  return emojiMap[temperatureCategory as "hot" | "cold" | "warm"];
}

/**
 * Converts the first found temperature in a given string from Celsius to Fahrenheit or vice versa.
 *
 * @param input A string containing a temperature expression.
 * @returns A string representing the converted temperature.
 */
function convertTemperature(input: string) {
  const regex = /(-?\d+(\.\d+)?)\s*(°|degrees)?\s*(celsius|fahrenheit|c|f)/i;
  const match = input.match(regex);

  if (match) {
    const value = parseFloat(match[1]);
    const unit = match[4].toLowerCase();
    if (unit === "celsius" || unit === "c") {
      const converted = Math.round((value * 9) / 5 + 32);
      return { temp: converted, measurement: "fahrenheit" };
    } else if (unit === "fahrenheit" || unit === "f") {
      const converted = Math.round(((value - 32) * 5) / 9);
      return { temp: converted, measurement: "celsius" };
    }
  }
  return null;
}
