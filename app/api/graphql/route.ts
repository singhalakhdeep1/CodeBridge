import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { ApolloServer } from '@apollo/server';
import { resolvers, typeDefs } from '@/lib/graphql/resolvers';
import { pubsub } from '@/lib/graphql/resolvers';
import { createClient } from '@/lib/supabase/server';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { user: null, pubsub, supabase };

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, created_at')
      .eq('id', authUser.id)
      .maybeSingle();
    const user = profile ? {
      id: profile.id,
      email: authUser.email ?? '',
      username: profile.username,
      createdAt: profile.created_at,
    } : null;
    return { user, pubsub, supabase };
  },
});

const handler = startServerAndCreateNextHandler(server);

export { handler as GET, handler as POST };
