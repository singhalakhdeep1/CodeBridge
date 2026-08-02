import { gql } from '@apollo/client';

export const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    username: String!
    createdAt: String!
  }

  type Project {
    id: ID!
    name: String!
    description: String
    ownerId: ID!
    createdAt: String!
    updatedAt: String!
  }

  type CodeSession {
    id: ID!
    projectId: ID!
    userId: ID!
    content: String!
    language: String!
    isActive: Boolean!
    participants: [User!]!
    createdAt: String!
    updatedAt: String!
  }

  type CollaborationEvent {
    id: ID!
    sessionId: ID!
    userId: ID!
    type: String!
    data: String!
    timestamp: String!
  }

  type Query {
    me: User
    project(id: ID!): Project
    projects: [Project!]!
    session(id: ID!): CodeSession
    activeSessions: [CodeSession!]!
  }

  type Mutation {
    createProject(name: String!, description: String): Project!
    updateProject(id: ID!, name: String, description: String): Project!
    deleteProject(id: ID!): Boolean!
    createSession(projectId: ID!, language: String!): CodeSession!
    joinSession(sessionId: ID!): CodeSession!
    leaveSession(sessionId: ID!): Boolean!
    updateSessionContent(sessionId: ID!, content: String!): CodeSession!
  }

  type Subscription {
    sessionUpdated(sessionId: ID!): CollaborationEvent!
    userJoinedSession(sessionId: ID!): User!
    userLeftSession(sessionId: ID!): User!
    projectCreated: Project!
    projectUpdated(projectId: ID!): Project!
  }
`;
