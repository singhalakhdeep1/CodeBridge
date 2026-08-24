/**
 * CodeBridge — Hocuspocus WebSocket Server
 *
 * Production-ready Hocuspocus server with Supabase persistence
 * Run: node server.js
 * Listens on: ws://localhost:3001
 */

const { Server } = require("@hocuspocus/server");
const { Database } = require("@hocuspocus/extension-database");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const port = parseInt(process.env.PORT || "3001", 10);

const server = Server.configure({
  port,
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        try {
          const [projectId, filePath] = documentName.split("::");
          const { data, error } = await supabase
            .from("files")
            .select("content")
            .eq("project_id", projectId)
            .eq("path", filePath)
            .single();
          
          if (error) throw error;
          return data?.content ? Buffer.from(data.content, "base64") : null;
        } catch (error) {
          console.error("[hocuspocus] fetch error:", error);
          return null;
        }
      },
      store: async ({ documentName, state }) => {
        try {
          const [projectId, filePath] = documentName.split("::");
          const { error } = await supabase
            .from("files")
            .upsert({
              project_id: projectId,
              path: filePath,
              content: Buffer.from(state).toString("base64"),
              updated_at: new Date().toISOString(),
            });
          
          if (error) throw error;
        } catch (error) {
          console.error("[hocuspocus] store error:", error);
        }
      },
    }),
  ],
  onAuthenticate: async ({ token, documentName }) => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        throw new Error("Unauthorized");
      }
      
      // Verify user has access to the project
      const [projectId] = documentName.split("::");
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id")
        .eq("id", projectId)
        .or(`owner_id.eq.${user.id},members.cs.{${user.id}}`)
        .single();
      
      if (projectError || !project) {
        throw new Error("Access denied to project");
      }
      
      return {
        userId: user.id,
        name: user.user_metadata?.name || user.email,
      };
    } catch (error) {
      console.error("[hocuspocus] auth error:", error.message);
      throw error;
    }
  },
  onConnect: async ({ socketId, documentName }) => {
    console.log(`[hocuspocus] client connected: ${socketId} to ${documentName}`);
  },
  onDisconnect: async ({ socketId, documentName }) => {
    console.log(`[hocuspocus] client disconnected: ${socketId} from ${documentName}`);
  },
  onChange: async ({ documentName }) => {
    console.log(`[hocuspocus] document changed: ${documentName}`);
  },
});

server.listen(() => {
  console.log(`[hocuspocus] WebSocket server running on ws://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[hocuspocus] SIGTERM received, shutting down...");
  server.destroy();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[hocuspocus] SIGINT received, shutting down...");
  server.destroy();
  process.exit(0);
});
