import { buildSchema } from "graphql";
import { createHandler } from "graphql-http/lib/use/express";
import express from "express";

const schema = buildSchema("type Query {hello: String } ");

const root = {
  hello() {
    return "Hello World";
  },
};

const app = express();

app.all(
  "/graphql",
  createHandler({
    schema: schema,
    rootValue: root,
  }),
);

// Start the server at port
app.listen(4000);
console.log("Running a GraphQL API server at http://localhost:4000/graphql");
