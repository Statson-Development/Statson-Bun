import type { Fact } from "#utility/schemas/fact.model";
import factModel from "#utility/schemas/fact.model";
import {
  EmbedBuilder as DjsEmbedBuilder,
  type APIEmbedField,
  type EmbedFooterOptions,
  type RestOrArray,
  type ColorResolvable,
  GuildMember,
  User,
} from "discord.js";
import config from "#config";

/**
 * The default embed builder for the bot.
 */
export default class EmbedBuilder extends DjsEmbedBuilder {
  /**
   * The default emoji for a fact.
   */
  private defaultFactEmoji =
    "https://cdn.streamersonglist.com/kisspng-incandescent-light-bulb-emoji-led-lamp-symbol-5aff6eb3f3aaf8.7281496115266894599981-2754-1577907392195.png";

  constructor(person?: GuildMember | User) {
    super();

    // Setting color.
    this.setColor(config.other.default_embed_color as ColorResolvable);

    // Setting author if provided.
    if (person) {
      this.setAuthor({
        name: person.displayName,
        iconURL: person.displayAvatarURL(),
      });
    }

    // Creating fact manager.
    const factManager = new FactManager();

    // Getting a random fact.
    const fact = factManager.getRanFact();

    // Setting footer.
    if (fact) {
      this.setFooter({
        text: fact.text,
        iconURL: fact.emoji || this.defaultFactEmoji,
      });
    }
  }

  public setFooter(footer: EmbedFooterOptions) {
    return super.setFooter({
      text: this.scanAndFormatNumbers(footer.text),
      iconURL: footer.iconURL,
    });
  }

  public setDescription(description: string) {
    return super.setDescription(this.scanAndFormatNumbers(description));
  }

  public setTitle(title: string) {
    return super.setTitle(this.scanAndFormatNumbers(title));
  }

  public addFields(...fields: RestOrArray<APIEmbedField>) {
    return super.addFields(
      fields.map((field) => {
        if (Array.isArray(field)) {
          return { name: "Error", value: "Cannot add array as field." };
        }
        return {
          name: this.scanAndFormatNumbers(field.name),
          value: this.scanAndFormatNumbers(field.value),
          inline: field.inline,
        };
      })
    );
  }

  public setFields(...fields: RestOrArray<APIEmbedField>) {
    return super.setFields(
      fields.map((field) => {
        if (Array.isArray(field)) {
          return { name: "Error", value: "Cannot add array as field." };
        }
        return {
          name: this.scanAndFormatNumbers(field.name),
          value: this.scanAndFormatNumbers(field.value),
          inline: field.inline,
        };
      })
    );
  }

  // ------------------- Private Helpers ------------------- //

  /**
   * Uses regular expressions to scan a string for any numbers, format them and return the new string.
   */
  private scanAndFormatNumbers(text: string): string {
    // Step 1: Temporarily replace content inside %% with placeholders.
    const placeholders: string[] = [];
    const placeholderPrefix = "PLACEHOLDER_";
    let index = 0;

    // Use a regex to match content inside %% and replace it with a placeholder
    const textWithPlaceholders = text.replace(/%%(.*?)%%/g, (match, p1) => {
      const placeholder = `${placeholderPrefix}${index++}`;
      placeholders.push(p1); // Store the content without the %% markers.
      return placeholder; // Replace the content with a placeholder.
    });

    // Step 2: Format numbers in the text, ignoring the placeholders.
    const formattedText = textWithPlaceholders.replace(
      /<[^<>]+>|(\d+)/g,
      (match, group1) => {
        // If group1 is not undefined, it means we matched a number outside of <>
        if (group1) {
          return group1.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
        // Otherwise, return the match unaltered (content inside <> or placeholders)
        return match;
      }
    );

    // Step 3: Restore the original content from placeholders, without the %% markers.
    const resultText = formattedText.replace(
      new RegExp(`${placeholderPrefix}\\d+`, "g"),
      (match) => {
        const originalIndex = parseInt(
          match.replace(placeholderPrefix, ""),
          10
        );
        return placeholders[originalIndex];
      }
    );

    return resultText;
  }
}

class FactManager {
  private facts: Fact[] = [];
  private static instance: FactManager;

  constructor() {
    if (FactManager.instance) {
      return FactManager.instance;
    } else {
      FactManager.instance = this;
    }
  }

  /**
   * Gets a fact from the database.
   *
   * Caches facts for faster access.
   */
  public getRanFact() {
    if (this.facts.length === 0) {
      this.loadFacts();
      return;
    } else {
      return this.facts[Math.floor(Math.random() * this.facts.length)];
    }
  }

  // todo: maybe change to load facts on client start.
  private async loadFacts() {
    this.facts = await factModel.find();
  }
}
