import type { Neo4jClientOptions } from "#utility/classes/Neo4jClient.js";
import { UserNeo4jClient } from "#utility/classes/UserNeo4jClient.js";
import { serviceModule } from "neos-handler";

export default serviceModule({
  name: "neo4jClient",
  service: UserNeo4jClient,
  options: {
    inject: [
      {
        database: "neo4j",
        user: "neo4j",
        password: Bun.env.NEO4J_USERS_PASSWORD,
        uri: Bun.env.NEO4J_URI,
      } as Neo4jClientOptions,
    ],
  },
});
