import { Driver, Session, auth, driver as createDriver } from "neo4j-driver";

export interface Neo4jClientOptions {
  uri: string;
  user: string;
  password: string;
  database: string;
}

/**
 * A singleton class for managing connections and sessions with a Neo4j database.
 * This class is responsible for executing queries and managing session lifecycles,
 * including a mechanism to reuse sessions and close them after a period of inactivity.
 */
export default class Neo4jClient {
  private driver: Driver;
  private database: string;
  private session: Session | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  /**
   * Creates an instance of Neo4jClient.
   * @param uri The connection URI for the Neo4j database.
   * @param user The username for authentication.
   * @param password The password for authentication.
   * @param database The name of the database to connect to.
   */
  constructor(options: Neo4jClientOptions) {
    this.driver = createDriver(options.uri, auth.basic(options.user, options.password));
    this.database = options.database;
  }

  /**
   * Resets the timeout for the session inactivity. If the session remains inactive
   * for more than 1 minute, it will be closed to free up resources.
   */
  private resetSessionTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(
      () => this.closeSession(),
      60_000
    ) as NodeJS.Timeout;
  }

  /**
   * Closes the current session if it's open.
   */
  private closeSession(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  /**
   * Ensures that a session is open. If no session is open, a new one is created.
   * Resets the session inactivity timeout on each call to prevent premature closing.
   */
  private async ensureSession(): Promise<void> {
    if (!this.session) {
      this.session = this.driver.session({ database: this.database });
    }
    this.resetSessionTimeout();
  }

  /**
   * Executes a Cypher query against the Neo4j database using the current session.
   * @param query The Cypher query to execute.
   * @param parameters An optional object containing query parameters.
   * @returns A promise that resolves with the result of the query.
   */
  public async runQuery(
    query: string,
    parameters: Record<string, any> = {}
  ) {
    await this.ensureSession();
    return await this.session!.run(query, parameters);
  }

  /**
   * Closes the Neo4j driver and any open session, releasing all resources.
   * Intended to be called when the application is shutting down or no longer needs to access the database.
   */
  public async closeDriver(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.session) {
      await this.session.close();
    }
    await this.driver.close();
  }
}
