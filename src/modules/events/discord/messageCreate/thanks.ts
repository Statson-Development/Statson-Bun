import { eventModule } from "neos-handler";

export default eventModule({
  emitter: "@internal/client",
  name: "messageCreate",
  execute: async (message) => {
    // Returning if dev.
    if (Bun.env.NODE_ENV === "development") return;

    // Converting to lowercase.
    const lowerContent = message.content.toLowerCase();

    if (lowerContent.includes("thanks neo")) {
      return await message.reply('Neo says: `"Your Welcome"`');
    }
    if (lowerContent.includes("thanks statson")) {
      return await message.reply("You're welcome :D!");
    }
  },
});
