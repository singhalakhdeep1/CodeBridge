import { PubSub } from 'graphql-subscriptions';
import { typeDefs } from './schema';

const pubsub = new PubSub();

const COLLABORATION_EVENTS = 'COLLABORATION_EVENTS';
const USER_JOINED = 'USER_JOINED';
const USER_LEFT = 'USER_LEFT';
const PROJECT_CREATED = 'PROJECT_CREATED';
const PROJECT_UPDATED = 'PROJECT_UPDATED';

// Mock data storage
const users = new Map();
const projects = new Map();
const sessions = new Map();

export { typeDefs };

export const resolvers = {
  Query: {
    me: (_: any, __: any, { user }: any) => user,
    project: (_: any, { id }: { id: string }) => projects.get(id),
    projects: () => Array.from(projects.values()),
    session: (_: any, { id }: { id: string }) => sessions.get(id),
    activeSessions: () => Array.from(sessions.values()).filter((s: any) => s.isActive),
  },

  Mutation: {
    createProject: (_: any, { name, description }: { name: string; description: string }, { user }: any) => {
      const project = {
        id: `proj_${Date.now()}`,
        name,
        description,
        ownerId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      projects.set(project.id, project);
      pubsub.publish(PROJECT_CREATED, { projectCreated: project });
      return project;
    },

    updateProject: (_: any, { id, name, description }: any) => {
      const project = projects.get(id);
      if (!project) throw new Error('Project not found');
      
      const updated = {
        ...project,
        ...(name && { name }),
        ...(description !== undefined && { description }),
        updatedAt: new Date().toISOString(),
      };
      projects.set(id, updated);
      pubsub.publish(PROJECT_UPDATED, { projectUpdated: updated, projectId: id });
      return updated;
    },

    deleteProject: (_: any, { id }: { id: string }) => {
      projects.delete(id);
      return true;
    },

    createSession: (_: any, { projectId, language }: { projectId: string; language: string }, { user }: any) => {
      const session = {
        id: `sess_${Date.now()}`,
        projectId,
        userId: user.id,
        content: '',
        language,
        isActive: true,
        participants: [user],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessions.set(session.id, session);
      return session;
    },

    joinSession: (_: any, { sessionId }: { sessionId: string }, { user }: any) => {
      const session = sessions.get(sessionId);
      if (!session) throw new Error('Session not found');
      
      if (!session.participants.find((p: any) => p.id === user.id)) {
        session.participants.push(user);
        pubsub.publish(USER_JOINED, { userJoinedSession: user, sessionId });
      }
      return session;
    },

    leaveSession: (_: any, { sessionId }: { sessionId: string }, { user }: any) => {
      const session = sessions.get(sessionId);
      if (!session) throw new Error('Session not found');
      
      session.participants = session.participants.filter((p: any) => p.id !== user.id);
      pubsub.publish(USER_LEFT, { userLeftSession: user, sessionId });
      
      if (session.participants.length === 0) {
        session.isActive = false;
      }
      return true;
    },

    updateSessionContent: (_: any, { sessionId, content }: { sessionId: string; content: string }, { user }: any) => {
      const session = sessions.get(sessionId);
      if (!session) throw new Error('Session not found');
      
      session.content = content;
      session.updatedAt = new Date().toISOString();
      
      const event = {
        id: `evt_${Date.now()}`,
        sessionId,
        userId: user.id,
        type: 'content_update',
        data: content,
        timestamp: new Date().toISOString(),
      };
      
      pubsub.publish(COLLABORATION_EVENTS, { sessionUpdated: event, sessionId });
      return session;
    },
  },

  Subscription: {
    sessionUpdated: {
      subscribe: (_: any, { sessionId }: { sessionId: string }) => {
        return pubsub.asyncIterator([`${COLLABORATION_EVENTS}_${sessionId}`]);
      },
    },
    userJoinedSession: {
      subscribe: (_: any, { sessionId }: { sessionId: string }) => {
        return pubsub.asyncIterator([`${USER_JOINED}_${sessionId}`]);
      },
    },
    userLeftSession: {
      subscribe: (_: any, { sessionId }: { sessionId: string }) => {
        return pubsub.asyncIterator([`${USER_LEFT}_${sessionId}`]);
      },
    },
    projectCreated: {
      subscribe: () => pubsub.asyncIterator([PROJECT_CREATED]),
    },
    projectUpdated: {
      subscribe: (_: any, { projectId }: { projectId: string }) => {
        return pubsub.asyncIterator([`${PROJECT_UPDATED}_${projectId}`]);
      },
    },
  },
};

export { pubsub };
