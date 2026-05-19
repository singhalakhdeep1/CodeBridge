/**
 * CodeSync — Local Hocuspocus WebSocket Server
 *
 * Minimal Hocuspocus server for local development.
 * For production, use the Cloudflare Durable Object (src/worker.ts).
 *
 * Run: node server.js  (or npm run dev for auto-restart)
 * Listens on: ws://localhost:1234
 */

const { Server } = require("@hocuspocus/server");

const port = parseInt(process.env.PORT ?? "1234", 10);

const server = Server.configure({
    port,
    // Disable auth for local dev — the provider sends a Supabase token
    // but we don't validate it locally
    async onAuthenticate() {
        return true;
    },
    async onConnect({ socketId }) {
        console.log(`[hocuspocus] client connected: ${socketId}`);
    },
    async onDisconnect({ socketId }) {
        console.log(`[hocuspocus] client disconnected: ${socketId}`);
    },
});

server.listen(() => {
    console.log(`[hocuspocus] WebSocket server running on ws://localhost:${port}`);
});
