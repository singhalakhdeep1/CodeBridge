'use client';

import { useSubscription, useMutation, useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_ACTIVE_SESSIONS = gql`
  query GetActiveSessions {
    activeSessions {
      id
      projectId
      language
      participants {
        id
        username
      }
      createdAt
    }
  }
`;

const SESSION_UPDATED = gql`
  subscription SessionUpdated($sessionId: ID!) {
    sessionUpdated(sessionId: $sessionId) {
      id
      userId
      type
      data
      timestamp
    }
  }
`;

const USER_JOINED = gql`
  subscription UserJoinedSession($sessionId: ID!) {
    userJoinedSession(sessionId: $sessionId) {
      id
      username
      email
    }
  }
`;

const UPDATE_CONTENT = gql`
  mutation UpdateSessionContent($sessionId: ID!, $content: String!) {
    updateSessionContent(sessionId: $sessionId, content: $content) {
      id
      content
      updatedAt
    }
  }
`;

export function GraphQLCollaboration({ sessionId }: { sessionId: string }) {
  const { data: sessionsData, loading: sessionsLoading } = useQuery(GET_ACTIVE_SESSIONS);
  const { data: updateData } = useSubscription(SESSION_UPDATED, { variables: { sessionId } });
  const { data: joinedData } = useSubscription(USER_JOINED, { variables: { sessionId } });
  const [updateContent] = useMutation(UPDATE_CONTENT);

  const handleContentChange = (content: string) => {
    updateContent({ variables: { sessionId, content } });
  };

  if (sessionsLoading) return <div>Loading sessions...</div>;

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Real-time Collaboration</h3>
      
      <div className="mb-4">
        <h4 className="font-medium mb-2">Active Sessions</h4>
        <ul className="space-y-2">
          {sessionsData?.activeSessions?.map((session: any) => (
            <li key={session.id} className="p-2 bg-muted rounded">
              <div className="font-medium">{session.projectId}</div>
              <div className="text-sm text-muted-foreground">
                {session.language} • {session.participants.length} participants
              </div>
            </li>
          ))}
        </ul>
      </div>

      {updateData?.sessionUpdated && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded">
          <div className="font-medium text-blue-700 dark:text-blue-300">
            Content Updated
          </div>
          <div className="text-sm text-muted-foreground">
            User {updateData.sessionUpdated.userId} made changes at {new Date(updateData.sessionUpdated.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {joinedData?.userJoinedSession && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 rounded">
          <div className="font-medium text-green-700 dark:text-green-300">
            {joinedData.userJoinedSession.username} joined the session
          </div>
        </div>
      )}

      <div>
        <textarea
          className="w-full p-3 border rounded min-h-[100px]"
          placeholder="Type to collaborate..."
          onChange={(e) => handleContentChange(e.target.value)}
        />
      </div>
    </div>
  );
}
