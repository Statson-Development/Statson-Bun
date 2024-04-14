import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord.js";
import { commandModule } from "neos-handler";
import moment from "moment-timezone";
import userModel from "#utility/schemas/user.model.js";

export default commandModule({
  name: "timestamp",
  description: "Create a new timestamp 🕰️.",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "date",
      type: ApplicationCommandOptionType.Number,
      description: "Pick a day, any day, from 1 to 31 📅.",
      required: true,
    },
    {
      name: "month",
      type: ApplicationCommandOptionType.String,
      description: "The month, from January to December or 1 to 12 🗓️.",
      required: true,
    },
    {
      name: "year",
      type: ApplicationCommandOptionType.Number,
      description: "The year of your escapade, past, present, or future 🚀.",
      required: true,
    },
    {
      name: "time",
      type: ApplicationCommandOptionType.String,
      description:
        "The time for precision down to the second, in 12 or 24-hour format ⏰.",
      required: false,
    },
  ],
  execute: async (interaction) => {
    // Fetching user's timezone from the database.
    const timeDoc = await userModel.findOne({
      id: interaction.user.id,
    });

    // Ensuring timezone exists.
    if (!timeDoc) {
      return interaction.reply({
        content:
          "Please set your timezone first using the `/time set` command ⏳.",
        ephemeral: true,
      });
    }

    // Getting all options from interaction.
    const date = interaction.options.getNumber("date")!;
    let month = interaction.options.getString("month")!;
    const year = interaction.options.getNumber("year")!;
    let time = interaction.options.getString("time");

    // Default to midday if no time is provided.
    if (!time) {
      time = "12:00 PM";
    }

    // Check if the month is numeric and convert it to a month name if necessary
    if (!isNaN(parseInt(month))) {
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      month = months[parseInt(month) - 1]; // Convert numeric month to its name
    }

    // Attempt to parse the provided time using multiple formats
    const formats = [
      "YYYY-MMMM-DD HH:mm",
      "YYYY-MMMM-DD h:mm A",
      "YYYY-MMMM-DD hA",
    ];
    const userTimezone = timeDoc.timezone;
    let dateTime = moment.tz(
      `${year}-${month}-${date} ${time}`,
      formats,
      true,
      userTimezone
    );

    // Ensuring the date and time are valid.
    if (!dateTime.isValid()) {
      return interaction.reply({
        content:
          "Invalid date or time provided. Please check your inputs and try again 🚫.",
        ephemeral: true,
      });
    }

    // Converting the moment object to a Unix timestamp.
    const timestamp = dateTime.unix();

    await interaction.reply(`<t:${timestamp}> - \`${timestamp}\``);
  },
});
