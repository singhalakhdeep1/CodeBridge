import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServer } from '@apollo/server';
import { resolvers, typeDefs } from '@/lib/graphql/resolvers';
import { pubsub } from '@/lib/graphql/resolvers';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const token = req.headers.authorization || '';
    // Verify token and get user (mock for now)
    const user = token ? { id: 'user_1', email: 'user@example.com', username: 'demo' } : null;
    return { user, pubsub };
  },
});

const handler = startServerAndCreateNextHandler(server);

export { handler as GET, handler as POST };
