import "neos-handler";
import "neos-container";
import type { Client } from "discord.js";
import type {
  Emitter,
  ModuleManager,
  CooldownManager,
  LoggerLike,
} from "neos-handler";
import type MongoClient from "#utility/classes/MongoClient";
import type Scheduler from "#utility/classes/Scheduler";

export interface ServiceMapBase {
  "@internal/client": Client;
  "@internal/emitter": Emitter;
  "@internal/moduleManager": ModuleManager;
  "@internal/cooldownManager": CooldownManager;
  "@internal/logger": LoggerLike;
  scheduler: Scheduler;
  database: MongoClient;
}

declare module "neos-handler" {
  interface ServiceMap extends ServiceMapBase {}
}

declare module "neos-container" {
  interface ServiceMap extends ServiceMapBase {}
}

export {};
