import { PubSub } from 'graphql-subscriptions';
import { typeDefs } from './schema';

const pubsub = new PubSub();
const events = { content: 'COLLABORATION_EVENTS', joined: 'USER_JOINED', left: 'USER_LEFT', created: 'PROJECT_CREATED', updated: 'PROJECT_UPDATED' };
type Context = { user: { id: string; email: string; username: string; createdAt: string } | null; supabase: any };
const requireUser = ({ user }: Context) => { if (!user) throw new Error('Authentication required'); return user; };
const check = (result: { data: any; error: any }) => { if (result.error) throw new Error(result.error.message); return result.data; };
const project = (row: any) => ({ id: row.id, name: row.name, description: row.description, ownerId: row.owner_id, createdAt: row.created_at, updatedAt: row.updated_at });
const member = (row: any) => ({ id: row.profiles?.id ?? row.user_id, email: null, username: row.profiles?.username ?? 'Unknown', createdAt: row.profiles?.created_at ?? row.joined_at });
const session = (row: any) => ({ id: row.id, projectId: row.project_id, userId: row.user_id, content: row.content, language: row.language, isActive: row.is_active, participants: (row.collaboration_session_participants ?? []).filter((item: any) => !item.left_at).map(member), createdAt: row.created_at, updatedAt: row.updated_at });
const sessionSelect = '*, collaboration_session_participants(user_id, joined_at, left_at, profiles(id, username, created_at))';
const slug = (name: string) => `${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project'}-${crypto.randomUUID().slice(0, 8)}`;

export { typeDefs };
export const resolvers = {
  Query: {
    me: (_: unknown, __: unknown, context: Context) => context.user,
    project: async (_: unknown, { id }: { id: string }, context: Context) => project(check(await context.supabase.from('workspaces').select('*').eq('id', id).single())),
    projects: async (_: unknown, __: unknown, context: Context) => check(await context.supabase.from('workspaces').select('*').order('updated_at', { ascending: false })).map(project),
    session: async (_: unknown, { id }: { id: string }, context: Context) => session(check(await context.supabase.from('collaboration_sessions').select(sessionSelect).eq('id', id).single())),
    activeSessions: async (_: unknown, __: unknown, context: Context) => check(await context.supabase.from('collaboration_sessions').select(sessionSelect).eq('is_active', true)).map(session),
  },
  Mutation: {
    createProject: async (_: unknown, { name, description }: { name: string; description?: string }, context: Context) => {
      const user = requireUser(context);
      const result = project(check(await context.supabase.from('workspaces').insert({ name, description: description ?? null, slug: slug(name), owner_id: user.id }).select('*').single()));
      await pubsub.publish(events.created, { projectCreated: result }); return result;
    },
    updateProject: async (_: unknown, { id, name, description }: { id: string; name?: string; description?: string }, context: Context) => {
      requireUser(context); const values: Record<string, string | null> = {};
      if (name !== undefined) values.name = name; if (description !== undefined) values.description = description;
      const result = project(check(await context.supabase.from('workspaces').update(values).eq('id', id).select('*').single()));
      await pubsub.publish(`${events.updated}_${id}`, { projectUpdated: result }); return result;
    },
    deleteProject: async (_: unknown, { id }: { id: string }, context: Context) => { requireUser(context); check(await context.supabase.from('workspaces').delete().eq('id', id)); return true; },
    createSession: async (_: unknown, { projectId, language }: { projectId: string; language: string }, context: Context) => {
      const user = requireUser(context);
      const created = check(await context.supabase.from('collaboration_sessions').insert({ project_id: projectId, user_id: user.id, language }).select('id').single());
      check(await context.supabase.from('collaboration_session_participants').insert({ session_id: created.id, user_id: user.id }));
      return session(check(await context.supabase.from('collaboration_sessions').select(sessionSelect).eq('id', created.id).single()));
    },
    joinSession: async (_: unknown, { sessionId }: { sessionId: string }, context: Context) => {
      const user = requireUser(context);
      check(await context.supabase.from('collaboration_session_participants').upsert({ session_id: sessionId, user_id: user.id, left_at: null }, { onConflict: 'session_id,user_id' }));
      const result = session(check(await context.supabase.from('collaboration_sessions').select(sessionSelect).eq('id', sessionId).single()));
      await pubsub.publish(`${events.joined}_${sessionId}`, { userJoinedSession: user }); return result;
    },
    leaveSession: async (_: unknown, { sessionId }: { sessionId: string }, context: Context) => {
      const user = requireUser(context); check(await context.supabase.from('collaboration_session_participants').update({ left_at: new Date().toISOString() }).eq('session_id', sessionId).eq('user_id', user.id));
      await pubsub.publish(`${events.left}_${sessionId}`, { userLeftSession: user }); return true;
    },
    updateSessionContent: async (_: unknown, { sessionId, content }: { sessionId: string; content: string }, context: Context) => {
      const user = requireUser(context);
      const result = session(check(await context.supabase.from('collaboration_sessions').update({ content }).eq('id', sessionId).select(sessionSelect).single()));
      await pubsub.publish(`${events.content}_${sessionId}`, { sessionUpdated: { id: crypto.randomUUID(), sessionId, userId: user.id, type: 'content_update', data: content, timestamp: new Date().toISOString() } }); return result;
    },
  },
  Subscription: {
    sessionUpdated: { subscribe: (_: unknown, { sessionId }: { sessionId: string }) => pubsub.asyncIterator([`${events.content}_${sessionId}`]) },
    userJoinedSession: { subscribe: (_: unknown, { sessionId }: { sessionId: string }) => pubsub.asyncIterator([`${events.joined}_${sessionId}`]) },
    userLeftSession: { subscribe: (_: unknown, { sessionId }: { sessionId: string }) => pubsub.asyncIterator([`${events.left}_${sessionId}`]) },
    projectCreated: { subscribe: () => pubsub.asyncIterator([events.created]) },
    projectUpdated: { subscribe: (_: unknown, { projectId }: { projectId: string }) => pubsub.asyncIterator([`${events.updated}_${projectId}`]) },
  },
};
export { pubsub };
