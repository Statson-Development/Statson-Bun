import { connect, type ConnectOptions } from "mongoose";

/**
 * The wrapper class to start and connect to the mongo client.
 */
export default class MongoClient {
  constructor() {
    this.connect();
  }
  /**
   * Connects to the mongo client.
   */
  public async connect(options?: ConnectOptions) {
    await connect(Bun.env.MONGO_URI, options);
  }
}
