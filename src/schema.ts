import { createSchema } from "graphql-yoga";
import type { Link } from "@prisma/client";
import type { GraphQLContext } from "./context.ts";
import { GraphQLError } from "graphql";
import { Prisma } from "@prisma/client";

const parseIntSafe = (value: string): number | null => {
  if (/^(\d+)$/.test(value)) {
    return parseInt(value, 10);
  }
  return null;
};

const typeDefinitions = /* GraphQL */ `
  type Query {
    info: String!
    feed: [Link!]!
    comment(id: ID!): Comment
    link(id: ID!): Link
  }

  type Mutation {
    postLink(url: String!, description: String!): Link!
    postCommentOnLink(linkId: ID!, body: String!): Comment!
  }

  type Link {
    id: ID!
    description: String!
    url: String!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    createdAt: String!
    body: String!
    link: Link!
  }
`;

const resolvers = {
  Query: {
    info: () => `This is the API of a Hackernews Clone`,
    // 3
    feed: async (parent: unknown, args: {}, context: GraphQLContext) => {
      return context.prisma.link.findMany();
    },
    comment: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) => {
      return context.prisma.comment.findUnique({
        where: {
          id: parseIntSafe(args.id),
        },
      });
    },
    link: async (
      parent: unknown,
      args: { id: string },
      context: GraphQLContext,
    ) => {
      return context.prisma.link.findUnique({
        where: {
          id: parseIntSafe(args.id),
        },
      });
    },
  },
  Comment: {
    id: (parent: Comment) => parent.id,
    createdAt: (parent: Comment) => parent.createdAt.toISOString(),
    body: (parent: Comment) => parent.body,
    link: (parent: Comment, args: {}, context: GraphQLContext) => {
      return context.prisma.link.findUnique({
        where: {
          id: parent.linkId,
        },
      });
    },
  },
  Link: {
    id: (parent: Link) => parent.id,
    description: (parent: Link) => parent.description,
    url: (parent: Link) => parent.url,
    comments: (parent: Link, args: {}, context: GraphQLContext) => {
      return context.prisma.comment.findMany({
        orderBy: { createdAt: "desc" },
        where: {
          linkId: parent.id,
        },
      });
    },
  },

  Mutation: {
    postLink: async (
      parent: unknown,
      args: { description: string; url: string },
      context: GraphQLContext,
    ) => {
      const newLink = await context.prisma.link.create({
        data: {
          description: args.description,
          url: args.url,
        },
      });
      return newLink;
    },
    postCommentOnLink: async (
      parent: unknown,
      args: { linkId: string; body: string },
      context: GraphQLContext,
    ) => {
      const newComment = await context.prisma.comment
        .create({
          data: {
            body: args.body,
            linkId: parseIntSafe(args.linkId),
          },
        })
        .catch((err: unknown) => {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2003"
          ) {
            return Promise.reject(
              new GraphQLError(
                `Cannot post comment on non-existing link with id '${args.linkId}'.`,
              ),
            );
          }
          return Promise.reject(err);
        });
      return newComment;
    },
  },
  // 4
};

export const schema = createSchema({
  typeDefs: [typeDefinitions],
  resolvers: [resolvers],
});
