import { gql } from 'graphql-yoga';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String
    createdAt: String!
    updatedAt: String!
  }

  type Team {
    id: ID!
    name: String!
    members: [User!]!
    createdAt: String!
  }

  type OAuthConnection {
    id: ID!
    providerId: String!
    userId: String!
    status: String!
    createdAt: String!
  }

  type Query {
    me: User
    users(limit: Int, offset: Int): [User!]!
    teams: [Team!]!
    oauthConnections: [OAuthConnection!]!
  }

  type Mutation {
    updateUser(input: UpdateUserInput!): User!
    createTeam(input: CreateTeamInput!): Team!
    deleteTeam(id: ID!): Boolean!
  }

  input UpdateUserInput {
    name: String
    email: String
  }

  input CreateTeamInput {
    name: String!
    memberIds: [ID!]!
  }
`;
