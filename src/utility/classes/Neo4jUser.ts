import { type UserNeo4jClient } from "./UserNeo4jClient";
import { Neo4jDirectRelation } from "../../typescript/enums/Neo4jDirectRelation";

export interface Neo4jUserOptions {
  id: string;
  clientInstance: UserNeo4jClient;
  parentIds?: string[];
  childrenIds?: string[];
  partnerId?: string;
}

export type Neo4jUserKeys = "_parents" | "_children" | "_partner";
export const dRelationshipToFieldMap: Record<
  Neo4jDirectRelation,
  Neo4jUserKeys
> = {
  [Neo4jDirectRelation.parent]: "_parents",
  [Neo4jDirectRelation.child]: "_children",
  [Neo4jDirectRelation.partner]: "_partner",
};

/**
 * The user class that represents a node in a neo4j db.
 */
export class Neo4jUser {
  public readonly id: string;
  private _parents?: Array<string | Neo4jUser>;
  get parents() {
    return this._parents;
  }

  private _children?: Array<string | Neo4jUser>;
  get children() {
    return this._children;
  }

  private _partner?: string | Neo4jUser | null;
  get partner() {
    return this._partner;
  }

  private readonly clientInstance: UserNeo4jClient;

  constructor(options: Neo4jUserOptions) {
    Object.assign(this, options);
  }

  /**
   * Checks if the user has a partner.
   */
  public hasPartner() {
    return this.partner !== undefined;
  }

  /**
   * Populates the specified field with user data from the database.
   * If no field is specified, all fields will be populated.
   * @param field The field to populate (optional).
   */
  public async populate(field?: Neo4jDirectRelation) {
    if (field) {
      const userResults = await this.clientInstance.getUsersByRelations(
        this.id,
        [field]
      );

      if (userResults[field]?.length === 0) {
        return;
      }

      if (field === Neo4jDirectRelation.partner) {
        this._partner = userResults.PARTNER_OF![0];
      } else {
        (this[dRelationshipToFieldMap[field]] as Neo4jUser[]) =
          userResults[field]!;
      }
    }
  }

  /**
   * Checks if a specified field or all relational fields are fully populated with Neo4jUser instances.
   * @param field The Neo4jDirectRelation field to check (optional).
   * @returns True if the specified field or all fields are fully populated, otherwise false.
   */
  public isFullyPopulated(field?: Neo4jDirectRelation): boolean {
    if (field) {
      // Check if a specific field is fully populated
      const internalField = this[dRelationshipToFieldMap[field]];
      if (Array.isArray(internalField)) {
        return internalField.every((f) => f instanceof Neo4jUser);
      }
      return internalField instanceof Neo4jUser || internalField === null;
    } else {
      // Check if all fields are fully populated
      return (
        (!this._partner || this._partner instanceof Neo4jUser) &&
        (!this._parents ||
          this._parents.every((p) => p instanceof Neo4jUser)) &&
        (!this._children || this._children.every((c) => c instanceof Neo4jUser))
      );
    }
  }

  /**
   * Marries a user to the current user.
   *
   * Internally calls the `clientInstance.createRelation()` method.
   */
  public async marry(user: Neo4jUser | string) {
    // Populating if partner not already.
    if (!this.isFullyPopulated(Neo4jDirectRelation.partner)) {
      await this.populate(Neo4jDirectRelation.partner);
    }

    // Checking if partner exists.
    if (this.partner) {
      throw new Error("Partner already exists.");
    }

    await this.clientInstance.createRelation(
      this.id,
      typeof user === "string" ? user : user.id,
      Neo4jDirectRelation.partner
    );
  }

  /**
   * Divorces the users current partner.
   *
   * Internally calls the `clientInstance.deleteRelation()` method.
   */
  public async divorce() {
    // Populating if partner not already.
    if (!this.isFullyPopulated(Neo4jDirectRelation.partner)) {
      await this.populate(Neo4jDirectRelation.partner);
    }

    // Checking if partner exists.
    if (!this.partner) {
      throw new Error("No partner exists.");
    }

    await this.clientInstance.deleteRelation(
      this.id,
      typeof this.partner === "string" ? this.partner : this.partner.id,
      Neo4jDirectRelation.partner
    );
  }

  /**
   * Makes someone a child of the user.
   *
   * Internally calls the `clientInstance.createRelation()` method.
   */
  public async makeChild(user: Neo4jUser | string) {
    await this.clientInstance.createRelation(
      this.id,
      typeof user === "string" ? user : user.id,
      Neo4jDirectRelation.child
    );
  }

  /**
   * Makes someone a parent of the user.
   *
   * Internally calls the `clientInstance.createRelation()` method.
   */
  public async makeParent(user: Neo4jUser | string) {
    await this.clientInstance.createRelation(
      this.id,
      typeof user === "string" ? user : user.id,
      Neo4jDirectRelation.parent
    );
  }
}
