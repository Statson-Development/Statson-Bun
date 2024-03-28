import timeModel, { Timezone } from "#utility/schemas/timezone.model";
import { ApplicationCommandOptionType, ApplicationCommandType } from "discord.js";
import { commandModule } from "neos-handler";
import timezones from "../../../../autocomplete/timezones.json";

export default commandModule({
  name: "time",
  description: "Manages time.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "set",
      description: "Add your timezone for everyone to see 🕒.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "timezone",
          description: "Your timezone ⌚.",
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true,
          aModule: {
            execute: async (interaction) => {
              const focusedTimezone = interaction.options.getFocused()!;

              const timesZones = await getRelatedTimezone(focusedTimezone);

              return interaction.respond(timesZones);
            },
          },
        },
      ],
    },
    {
      name: "get",
      description: "Returns a users timezone 😮.",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "user",
          description: "The user to get 🧏.",
          type: ApplicationCommandOptionType.User,
        },
      ],
    },
    {
      name: "delete",
      description: "Removes your timezone from my database 😥.",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  execute: async (interaction) => {
    switch (interaction.options.getSubcommand()) {
      case "set": {
        // Getting the timezone from the discord interaction.
        const timezone = interaction.options.getString("timezone")!;

        // Updating in db.
        await timeModel.findOneAndUpdate(
          {
            userId: interaction.user.id,
          },
          {
            timezone,
          },
          {
            upsert: true,
          }
        );

        // Responding.
        await interaction.reply({
          content: `I have set your timezone to: \`${timezone}\``,
          ephemeral: true,
        });
        break;
      }
      case "get": {
        // Defining the user to fetch.
        const user = interaction.options.getUser("user") || interaction.user;

        // Fetching their timezone from db.
        const timezoneDoc = await timeModel.findOne({ userId: user.id });

        // Checking if existence.
        if (!timezoneDoc) {
          return interaction.reply({
            content: `${
              user === interaction.user ? "Your" : `${user}'s`
            } timezone has not yet been set!`,
            ephemeral: true,
          });
        }

        // Creating timezone stamp.
        const timeData = extractTimezoneData(timezoneDoc);
        /*
         ^^ Returns a object with a timezone member and a timestamp member.
         The timezone is a human readable version of their timezone,
         while timestamp is the discord interpretable timestamp.
        */

        await interaction.reply({
          content: `Current time for ${user} is ${timeData.timestamp}, in timezone: \`${timeData.timezone}\`.`,
          allowedMentions: { parse: [] },
        });
        break;
      }
      case "delete": {
        // Deleting from the database.
        await timeModel.deleteOne({ userId: interaction.user.id });

        await interaction.reply({
          content: "I have deleted your timezone from my database.",
          ephemeral: true,
        });
        break;
      }
    }
  },
});

/**
 * This function is used to get the timezones that include the search string.
 */
async function getRelatedTimezone(s: string) {
  // Filter the timezones that include the search string.
  const relevantZones = timezones.filter((choice) =>
    choice.toLowerCase().includes(s.toLowerCase())
  );

  // Returning a new array that contains the first 25 relevant timezones in a discord choice format.
  return relevantZones.slice(0, 25).map((z) => ({ name: z, value: z }));
}

/**
 * Takes a timezone db doc and converts it to a timestamp readable by discord.
 */
function extractTimezoneData(timezoneDoc: Timezone): {
  timestamp: string;
  timezone: string;
} {
  // Regular expression to match Etc/GMT timezones with an offset
  const etcPattern = /^Etc\/GMT([+-]\d+)$/i;

  // Attempt to match the timezone against the regular expression
  const match = timezoneDoc.timezone.match(etcPattern);

  // Initialize the adjustedTimezone with the original timezone from the document
  let adjustedTimezone = timezoneDoc.timezone;

  // If the timezone matches the Etc/GMT pattern, adjust the offset sign
  if (match) {
    const offset = parseInt(match[1], 10);
    adjustedTimezone = `Etc/GMT${offset > 0 ? "-" : "+"}${Math.abs(offset)}`;
  }

  // Create a string representation of the current date and time in the adjusted timezone
  const currentDate = new Date().toLocaleString("en-US", {
    timeZone: adjustedTimezone,
  });

  // Convert the current date and time to a Unix timestamp using the adjusted timezone
  const timestamp = Math.floor(new Date(currentDate).getTime() / 1000);

  // Get the full date and timezone string using the Intl.DateTimeFormat constructor
  const fullDateTimeZone = new Intl.DateTimeFormat("en-US", {
    timeZone: adjustedTimezone,
    timeZoneName: "long",
  }).format(new Date());

  // Use a regular expression to extract just the timezone name from the full string
  const timezoneNameMatch = fullDateTimeZone.match(/, (.*)$/);
  const timezoneName = timezoneNameMatch
    ? timezoneNameMatch[1]
    : "Unknown Timezone";

  // Return an object with the timestamp in Discord's Unix timestamp format and the human-readable timezone name
  return {
    timestamp: `<t:${timestamp}>`,
    timezone: timezoneName,
  };
}
