-- CodeSync Schema
-- Real-time collaborative code editor with CRDT (Yjs) + Supabase Realtime

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- USERS / PROFILES
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- WORKSPACES (org-level multi-tenancy)
-- =============================================
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- =============================================
-- DOCUMENTS (files in a workspace)
-- =============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  language TEXT NOT NULL DEFAULT 'typescript',
  content TEXT DEFAULT '',  -- snapshot of current content (for display / search)
  path TEXT NOT NULL DEFAULT '/',  -- virtual file path e.g. /src/index.ts
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GIN index for full-text search on document content
CREATE INDEX idx_documents_content_fts ON documents USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '')));
CREATE INDEX idx_documents_workspace ON documents(workspace_id);
CREATE INDEX idx_documents_updated ON documents(updated_at DESC);

-- =============================================
-- DOCUMENT VERSIONS (snapshot history)
-- =============================================
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  snapshot BYTEA,  -- Yjs binary state vector snapshot
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  label TEXT  -- optional version label e.g. "Before refactor"
);

CREATE INDEX idx_doc_versions_doc ON document_versions(document_id, created_at DESC);

-- =============================================
-- PRESENCE (real-time cursors / awareness)
-- Managed via Supabase Realtime Presence, not persisted
-- This table is for session audit only
-- =============================================
CREATE TABLE edit_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- =============================================
-- COMMENTS (inline code comments, like PR reviews)
-- =============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  line_start INT NOT NULL,
  line_end INT NOT NULL,
  content TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_document ON comments(document_id, line_start);

-- =============================================
-- EXECUTION RUNS (code execution history)
-- =============================================
CREATE TABLE execution_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  stdin TEXT,
  stdout TEXT,
  stderr TEXT,
  exit_code INT,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'error', 'timeout')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exec_runs_document ON execution_runs(document_id, created_at DESC);

-- GraphQL collaboration sessions. These replace the former in-memory resolver store.
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'typescript',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE collaboration_session_participants (
  session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (session_id, user_id)
);

CREATE INDEX idx_collaboration_sessions_project ON collaboration_sessions(project_id, updated_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_session_participants ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, owner can write
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_owner_write" ON profiles FOR ALL USING (auth.uid() = id);

-- Workspaces: members can read, owner can manage
CREATE POLICY "workspaces_member_read" ON workspaces FOR SELECT
  USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );
CREATE POLICY "workspaces_owner_write" ON workspaces FOR ALL USING (owner_id = auth.uid());

-- Workspace members
CREATE POLICY "workspace_members_member_read" ON workspace_members FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "workspace_members_admin_write" ON workspace_members FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Documents: workspace members can read; editors/admins/owners can write
CREATE POLICY "documents_member_read" ON documents FOR SELECT
  USING (
    is_public = TRUE
    OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );
CREATE POLICY "documents_editor_write" ON documents FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    )
  );

-- Document versions: same as documents
CREATE POLICY "doc_versions_member_read" ON document_versions FOR SELECT
  USING (document_id IN (SELECT id FROM documents WHERE
    is_public = TRUE OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  ));
CREATE POLICY "doc_versions_editor_insert" ON document_versions FOR INSERT WITH CHECK (created_by = auth.uid());

-- Comments
CREATE POLICY "comments_member_read" ON comments FOR SELECT
  USING (document_id IN (SELECT id FROM documents WHERE
    is_public = TRUE OR workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  ));
CREATE POLICY "comments_member_insert" ON comments FOR INSERT WITH CHECK (
  author_id = auth.uid() AND
  document_id IN (SELECT id FROM documents WHERE
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "comments_author_update" ON comments FOR UPDATE USING (author_id = auth.uid());

-- Execution runs
CREATE POLICY "exec_runs_member_read" ON execution_runs FOR SELECT
  USING (document_id IN (SELECT id FROM documents WHERE
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  ));
CREATE POLICY "exec_runs_user_insert" ON execution_runs FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_member_read" ON collaboration_sessions FOR SELECT USING (
  project_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "sessions_member_write" ON collaboration_sessions FOR ALL USING (
  project_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor'))
);
CREATE POLICY "session_participants_read" ON collaboration_session_participants FOR SELECT USING (
  session_id IN (SELECT id FROM collaboration_sessions)
);
CREATE POLICY "session_participants_write" ON collaboration_session_participants FOR ALL USING (user_id = auth.uid());

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-create profile on auth user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-add creator to workspace as owner
CREATE OR REPLACE FUNCTION handle_workspace_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION handle_workspace_created();

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_collaboration_sessions_updated_at BEFORE UPDATE ON collaboration_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- REALTIME (enable for presence + live updates)
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE execution_runs;
