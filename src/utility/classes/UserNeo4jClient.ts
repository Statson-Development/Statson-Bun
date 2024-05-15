import { type QueryResult, Record } from "neo4j-driver";
import Neo4jClient, { type Neo4jClientOptions } from "./Neo4jClient";
import { Neo4jUser } from "./Neo4jUser";
import { Neo4jDirectRelation } from "../../typescript/enums/Neo4jDirectRelation";

/**
 * The object returned by the "getUsersByRelations" method.
 * It contains the relationship as the key and the users as the value.
 */
export type RelationshipResult = {
  [K in Neo4jDirectRelation]?: Neo4jUser[];
};

/**
 * This class extends the normal Neo4j Client but is specifically designed for the user db inside the graph instance.
 * Since Neo4j is only used for the user db,
 *  it has been structured so that each db has its own client class in the services.
 */
export class UserNeo4jClient extends Neo4jClient {
  constructor(options: Neo4jClientOptions) {
    super(options);
  }

  /**
   * Takes two users and returns the shortest relationship path between them.
   * @returns The expanded relationship path. E.G: "PARENT_OF CHILD_OF" (sibling).
   */
  public async getRelation(
    user1: Neo4jUser | string,
    user2: Neo4jUser | string
  ) {
    // Importing the query from the file.
    const query = await Bun.file(
      "../../../scripts/cypher/generateRelPath.cql"
    ).text();

    // Fetching the shortest relationship path between the two users.
    const res = await this.runQuery(query, {
      uid1: typeof user1 === "string" ? user1 : user1.id,
      uid2: typeof user2 === "string" ? user2 : user2.id,
    });

    // Checking a record was returned.
    if (res.records.length === 0) return null;

    // Returning the expanded rel path.
    return res.records[0].get("pathDescription") as string;
  }

  /**
   * Retrieves a user from the database based on their unique ID.
   * @param id The unique identifier of the user to be retrieved.
   * @returns A Promise that resolves to a RelationUser instance representing the user,
   *          or null if no user is found with the specified ID.
   */
  public async getUserById(id: string) {
    const queryResult = (await this.runQuery(
      `MATCH (u:User {id: $id}) RETURN u`,
      { id }
    )) as QueryResult;

    // Check if no user was found.
    if (queryResult.records.length === 0) {
      return null;
    }

    // Convert the first record to a RelationUser instance and return it.
    return this.recordsToUsers(queryResult.records, false);
  }

  /**
   * Finds users based on a set of relationships with another user.
   * @param userId The ID of the user related by the specified relationships.
   * @param relations An array of relationship types (e.g., ['PARENT_OF', 'PARTNER_OF']).
   * @returns An object with keys as relationship types and values as arrays of RelationUser instances.
   */
  public async getUsersByRelations(
    userId: string,
    relations: Neo4jDirectRelation[]
  ): Promise<RelationshipResult> {
    // Construct a query to fetch users based on multiple relations.
    const relationQueries = relations
      .map((rel) => {
        return `MATCH (u:User)-[:${rel}]->(related:User {id: $userId}) RETURN u, '${rel}' as relation`;
      })
      .join(" UNION ");

    const result = (await this.runQuery(relationQueries, {
      userId,
    })) as QueryResult;

    // Create an object to store the result with relations as keys.
    const relationResults: RelationshipResult = {};

    result.records.forEach((record) => {
      const user = new Neo4jUser({
        id: record.get("u").properties.id,
        clientInstance: this,
      });
      const relation = record.get("relation") as Neo4jDirectRelation;

      if (!relationResults[relation]) {
        relationResults[relation] = [];
      }
      relationResults[relation]!.push(user);
    });

    return relationResults;
  }

  /**
   * Creates a direct relationship between two users.
   */
  public async createRelation(
    user1: Neo4jUser | string,
    user2: Neo4jUser | string,
    relation: Neo4jDirectRelation
  ) {
    await this.runQuery(
      `
     MATCH (u1:User {id: $uid1}), (u2:User {id: $uid2})
     CREATE (u1)-[r:${relation}]->(u2)
    `,
      {
        uid1: typeof user1 === "string" ? user1 : user1.id,
        uid2: typeof user2 === "string" ? user2 : user2.id,
      }
    );
  }

  /**
   * Deletes a direct relationship between two users.
   * @param user1 The first user involved in the relationship (can be a Neo4jUser instance or a user ID).
   * @param user2 The second user involved in the relationship (can be a Neo4jUser instance or a user ID).
   * @param relation The type of relationship to delete (e.g., 'PARENT_OF', 'PARTNER_OF').
   */
  public async deleteRelation(
    user1: Neo4jUser | string,
    user2: Neo4jUser | string,
    relation: Neo4jDirectRelation
  ): Promise<void> {
    await this.runQuery(
      `MATCH (u1:User {id: $uid1})-[r:${relation}]->(u2:User {id: $uid2})
     DELETE r`,
      {
        uid1: typeof user1 === "string" ? user1 : user1.id,
        uid2: typeof user2 === "string" ? user2 : user2.id,
      }
    );
  }

  /**
   * Gets a users partner.
   */
  public async getUsersPartner(user: Neo4jUser | string) {
    // Fetching the user's partner.
    const partner = await this.getUsersByRelations(
      typeof user === "string" ? user : user.id,
      [Neo4jDirectRelation.partner]
    );

    // Checking if the user has a partner.
    return partner.PARTNER_OF?.[0];
  }

  /**
   * Converts the neo4j record returned by the db into a instanced user class.
   * @param plural Helps to tell typescript if the return value should be an array or a single instance.
   */
  private async recordsToUsers<P extends boolean = true>(
    records: Record[],
    plural?: P
  ): Promise<P extends true ? Neo4jUser[] : Neo4jUser> {
    // Checking records exist.
    if (records.length === 0) throw new Error("No records found.");

    // Mapping users from records.
    const users = records.map((record) => {
      const user = record.get("u").properties;

      return new Neo4jUser({
        id: user.id,
        clientInstance: this,
      });
    });

    // Return based on the plural flag
    return (plural === false ? users[0] : users) as P extends true
      ? Neo4jUser[]
      : Neo4jUser;
  }
}
