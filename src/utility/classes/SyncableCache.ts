import type { FilterQuery, UpdateQuery } from "mongoose";
import type { ReturnModelType } from "@typegoose/typegoose";
import type { AnyParamConstructor } from "@typegoose/typegoose/lib/types";

/**
 * A cache that synchronizes its contents with a database. It is designed to work with Mongoose models
 * and provides basic set and delete operations. The cache can be configured to sync with the database
 * at regular intervals, when a certain number of items are in the cache, or manually. The key used for
 * cache entries can be mapped to a custom database query. Additionally, a specific field can be
 * selected to store in the cache when fetching from the database. The cache can also be configured to
 * sync after a specified number of set operations.
 */
export class SyncableCache<T extends object> {
  private cache = new Map<string, T>();
  private syncInterval: NodeJS.Timeout | undefined;
  private cacheField: keyof T | null; // The field to cache
  private setCounter = 0; // Counter for set operations
  private syncThreshold: number | null = null; // Threshold for syncing after set operations

  /**
   * Creates an instance of SyncableCache.
   * @param model The Mongoose model used for database operations.
   * @param keyToQuery A function that maps a cache key to a database query.
   * @param cacheField An optional field to cache instead of the full document.
   * @param syncThreshold The number of set operations after which the cache will sync with the database.
   */
  constructor(
    private model: ReturnModelType<AnyParamConstructor<any>>,
    private keyToQuery: (key: string) => FilterQuery<T> = (key) => ({ _id: key }),
    cacheField: keyof T | null = null
  ) {
    this.cacheField = cacheField;
  }

  /**
   * Gets a value from the cache or the database if it's not in the cache.
   * @param key The key associated with the value.
   * @returns The value associated with the key, or undefined if the key is not found in the cache or the database.
   */
  public async get(key: string): Promise<T | undefined> {
    let value = this.cache.get(key);

    if (!value) {
      const query = this.keyToQuery(key);
      const document = await this.model.findOne(query);

      if (document) {
        const fullDoc = document.toObject() as T;
        if (this.cacheField && this.cacheField in fullDoc) {
          value = { [this.cacheField]: fullDoc[this.cacheField] } as T;
        } else {
          value = fullDoc;
        }

        this.cache.set(key, value);
      }
    }

    return value;
  }

  /**
   * Sets a value in the cache. Triggers a sync with the database if the number of set operations
   * reaches the sync threshold.
   * @param key The key associated with the value.
   * @param value The value to store in the cache. Can be a partial update.
   */
  public set(key: string, value: Partial<T>) {
    const existingValue = this.cache.get(key) || ({} as T);
    const updatedValue = { ...existingValue, ...value };
    this.cache.set(key, updatedValue);

    if (this.syncThreshold !== null) {
      this.setCounter++;
      if (this.setCounter >= this.syncThreshold) {
        this.sync();
        this.setCounter = 0;
      }
    }
  }

  /**
   * Deletes a value from the cache and optionally synchronizes the deletion with the database.
   * @param key The key associated with the value to delete.
   * @param autoSync Whether to automatically sync the deletion with the database.
   */
  public delete(key: string, autoSync = true) {
    this.cache.delete(key);
    if (autoSync) {
      const query = this.keyToQuery(key);
      this.model.findOneAndDelete(query);
    }
  }

  /**
   * Configures the cache to sync with the database at regular intervals.
   * @param ms The interval in milliseconds at which to sync the cache with the database.
   */
  public intervalSync(ms: number) {
    this.syncInterval = setInterval(async () => {
      await this.sync();
    }, ms);
  }

  /**
   * Cancels the automatic syncing of the cache with the database.
   */
  public cancelIntervalSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Configures the cache to sync with the database after a specified number of set operations.
   * @param threshold The number of set operations after which the cache will sync with the database.
   */
  public setSyncThreshold(threshold: number) {
    this.syncThreshold = threshold;
  }

  /**
   * Cancels syncing after a specified number of set operations.
   */
  public cancelSetSync() {
    this.syncThreshold = null;
    this.setCounter = 0;
  }

  /**
   * Synchronizes the cache with the database by updating or inserting cached items into the database
   * and then clearing the cache.
   */
  private async sync() {
    for (const [key, value] of this.cache) {
      const query = this.keyToQuery(key);
      await this.model.findOneAndUpdate(query, value as UpdateQuery<T>, {
        upsert: true,
      });
      this.cache.delete(key);
    }
  }
}
