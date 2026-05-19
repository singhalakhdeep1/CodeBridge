-- CodeSync seed data
-- Requires schema.sql to be applied first. Run after auth.users are created.

-- NOTE: Insert demo users via Supabase Auth UI or CLI first, then run this seed.
-- These UUIDs are placeholders — replace with real auth user IDs.

-- Demo workspace
INSERT INTO workspaces (id, name, slug, owner_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Workspace',
  'demo',
  (SELECT id FROM profiles LIMIT 1)
) ON CONFLICT DO NOTHING;

-- Demo document: TypeScript
INSERT INTO documents (id, workspace_id, title, language, content, path, created_by)
SELECT
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'index.ts',
  'typescript',
  E'// Welcome to CodeSync\n// Start typing to collaborate in real-time!\n\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));\n',
  '/src/index.ts',
  id
FROM profiles
LIMIT 1
ON CONFLICT DO NOTHING;

-- Demo document: Python
INSERT INTO documents (id, workspace_id, title, language, content, path, created_by)
SELECT
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'main.py',
  'python',
  E'# CodeSync — Python example\n\ndef greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("World"))\n',
  '/src/main.py',
  id
FROM profiles
LIMIT 1
ON CONFLICT DO NOTHING;
