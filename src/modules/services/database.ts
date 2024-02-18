import MongoClient from "#utility/classes/MongoClient";
import { serviceModule } from "neos-handler";

export default serviceModule({
  name: "database",
  service: MongoClient,
});
