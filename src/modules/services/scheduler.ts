import Scheduler, { type SchedulerOptions } from "#utility/classes/Scheduler";
import { Bot, serviceModule } from "neos-handler";

export default serviceModule({
  name: "scheduler",
  service: Scheduler,
  options: {
    initializer: async (container) => {
      // Loading all tasks.
      const scheduler = await container.resolve("scheduler");

      await scheduler.loadTasks();
    },
    inject: [
      {
        taskPresets: [
          [
            "unbanMember",
            async (userId: string, guildId: string, unbanReason?: string) => {
              // Resolving the client from the bot.
              const client = await Bot.getInstance().container.resolve(
                "@internal/client"
              );

              // Resolving the guild with the client.
              const guild = await client.guilds.fetch(guildId);

              // Removing the ban.
              await guild.bans.remove(userId, unbanReason);
            },
          ],
        ],
      } as SchedulerOptions,
    ],
  },
});
