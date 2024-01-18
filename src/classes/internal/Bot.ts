import { Container } from "neos-container";
import { Timer } from "../helper/Timer";
import { resolve } from "path";
import Logger from "./Logger";

/**
 * The primary bot class!
 *
 * Everything stretches from here.
 * The bot class is responsible for loading all services and connecting to the client.
 */
export default class Bot {
  // Fundamental Bot Properties
  public readonly container = new Container({});

  public constructor() {
    const timer = new Timer(true);
    // ------------------------ Initialization ------------------------ //

    const logger = new Logger();

    (async () => {
      /*
         Placed inside a IIFE to allow for async code to be run.
         Modules cannot be loaded until services have completed.
        */
      // ----------- Loading Services ----------- //
      logger.info("Loading services...");

      await this.container
        .autoLoad(resolve(import.meta.dir, "../../services"))
        .catch((err) => {
          throw new Error(`Error auto loading services: ${err}`);
        })
        .then(() => {
          logger.success("Completed loading services.");
        });

      // ----------- Loading Modules ----------- //

      logger.info("Loading modules...");

      const handler = await this.container.resolve("@internal/handler");

      await handler.loadModules().then(() => {
        logger.success("Completed loading modules.");
      });

      // ---------- Publishing Commands --------- //

      logger.info("Publishing commands...");

      await runPromiseWithTimeout(
        handler.publishCommands.bind(handler),
        10000,
        [],
        "Command publishing timed out!"
      ).then(() => {
        logger.success("Completed publishing commands.");
      });

      // ----------- Adding Listeners ----------- //

      logger.info("Loading listeners...");

      await handler.startModuleListeners().then(() => {
        logger.success("Completed listener loading.");
      });

      // --------- Logging into Discord --------- //

      const client = await this.container.resolve("@internal/discordClient");

      await client.login(Bun.env.DISCORD_TOKEN).then(() => {
        logger
          .info(`Logged into ${client.user?.tag}.`)
          .info(`Took ${timer.end()} to start.`);
      });

      // ---------------------- Post Initialization ---------------------- //

      process.on("SIGINT", async () => {
        if (Bun.env.NODE_ENV === "production") {
          logger.info("\nGracefully shutting down...");

          await this.container.disposeAll();
        }
        process.exit(0);
      });
    })();
  }

  /**
   * @returns the bots dependency container.
   */
  public static getContainer() {
    return Container.getContainer();
  }
}
