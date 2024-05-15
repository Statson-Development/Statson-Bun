import "neos-handler";
import "neos-container";
import type { Client } from "discord.js";
import type {
  Emitter,
  ModuleManager,
  CooldownManager,
  LoggerLike,
} from "neos-handler";
import type MongoClient from "#utility/classes/MongoClient.js";
import type Scheduler from "#utility/classes/Scheduler";
import type OpenAI from "openai";
import type { UserNeo4jClient } from "#utility/classes/UserNeo4jClient.js";

export interface ServiceMapBase {
  "@internal/client": Client;
  "@internal/emitter": Emitter;
  "@internal/moduleManager": ModuleManager;
  "@internal/cooldownManager": CooldownManager;
  "@internal/logger": LoggerLike;
  scheduler: Scheduler;
  mongoClient: MongoClient;
  neo4jClient: UserNeo4jClient;
  openai: OpenAI;
}

declare module "neos-handler" {
  interface ServiceMap extends ServiceMapBase {}
}

declare module "neos-container" {
  interface ServiceMap extends ServiceMapBase {}
}

export {};
