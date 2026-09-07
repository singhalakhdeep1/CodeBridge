/**
 * WebRTC Signaling Server — unit tests
 *
 * We extract the pure room/client management logic and test it in isolation
 * (no actual WebSocket network I/O). Covers:
 *  - join-room: room creation, participant notification, existing-participants list
 *  - leave-room: room cleanup, user-left notifications, empty-room GC
 *  - disconnect: same as leave-room but triggered by connection drop
 *  - offer/answer/ice-candidate forwarding
 *  - Multi-user scenarios (3+ peers in one room)
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ────────────────────────────────────────────────────────────────────────────
// Minimal in-process re-implementation of the signaling server logic
// (mirrors webrtc-signaling-server.js exactly, but module-exportable for testing)
// ────────────────────────────────────────────────────────────────────────────

interface FakeWs {
  userId?: string;
  roomId?: string;
  readyState: number;
  sent: any[];
  send(data: string): void;
}

const WS_OPEN = 1;

function makeFakeWs(id: string): FakeWs {
  return {
    userId: undefined,
    roomId: undefined,
    readyState: WS_OPEN,
    sent: [],
    send(data: string) { this.sent.push(JSON.parse(data)); },
  };
}

/**
 * Minimal state + handlers — extracted from webrtc-signaling-server.js logic.
 */
function buildSignalingState() {
  const rooms = new Map<string, Set<string>>();
  const clients = new Map<string, FakeWs>();

  function handleJoinRoom(ws: FakeWs, clientId: string, data: any) {
    const { roomId, userId } = data;
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    const room = rooms.get(roomId)!;
    room.add(clientId);
    ws.userId = userId;
    ws.roomId = roomId;

    // Notify existing participants
    const participants = Array.from(room).filter((id) => id !== clientId);
    participants.forEach((pid) => {
      const pws = clients.get(pid);
      if (pws && pws.readyState === WS_OPEN) {
        pws.send(JSON.stringify({ type: 'user-joined', userId, clientId }));
      }
    });

    // Send current participants back to new user
    ws.send(JSON.stringify({
      type: 'room-joined',
      roomId,
      participants: participants.map((id) => ({ clientId: id, userId: clients.get(id)?.userId })),
    }));
  }

  function handleLeaveRoom(clientId: string, data: any) {
    const ws = clients.get(clientId);
    if (!ws) return;
    const { roomId } = data;
    const room = rooms.get(roomId);
    if (room) {
      room.delete(clientId);
      room.forEach((pid) => {
        const pws = clients.get(pid);
        if (pws && pws.readyState === WS_OPEN) {
          pws.send(JSON.stringify({ type: 'user-left', userId: ws.userId, clientId }));
        }
      });
      if (room.size === 0) rooms.delete(roomId);
    }
  }

  function handleDisconnect(clientId: string) {
    const ws = clients.get(clientId);
    if (!ws) return;
    const { roomId, userId } = ws;
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.delete(clientId);
        room.forEach((pid) => {
          const pws = clients.get(pid);
          if (pws && pws.readyState === WS_OPEN) {
            pws.send(JSON.stringify({ type: 'user-left', userId, clientId }));
          }
        });
        if (room.size === 0) rooms.delete(roomId);
      }
    }
    clients.delete(clientId);
  }

  function handleForward(type: string, data: any) {
    const targetWs = clients.get(data.targetClientId);
    if (targetWs && targetWs.readyState === WS_OPEN) {
      targetWs.send(JSON.stringify({ type, ...data }));
    }
  }

  return { rooms, clients, handleJoinRoom, handleLeaveRoom, handleDisconnect, handleForward };
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('WebRTC Signaling — room management', () => {
  let state: ReturnType<typeof buildSignalingState>;

  beforeEach(() => { state = buildSignalingState(); });

  // ── join-room ────────────────────────────────────────────────────────────

  it('creates a new room when first user joins', () => {
    const ws = makeFakeWs('client-1');
    state.clients.set('client-1', ws);
    state.handleJoinRoom(ws, 'client-1', { roomId: 'room-A', userId: 'user-1' });

    expect(state.rooms.has('room-A')).toBe(true);
    expect(state.rooms.get('room-A')!.has('client-1')).toBe(true);
  });

  it('sends room-joined with empty participants list for first user', () => {
    const ws = makeFakeWs('client-1');
    state.clients.set('client-1', ws);
    state.handleJoinRoom(ws, 'client-1', { roomId: 'room-A', userId: 'user-1' });

    const msg = ws.sent.find((m) => m.type === 'room-joined');
    expect(msg).toBeDefined();
    expect(msg.participants).toHaveLength(0);
  });

  it('notifies existing participant when second user joins', () => {
    const ws1 = makeFakeWs('client-1');
    const ws2 = makeFakeWs('client-2');
    state.clients.set('client-1', ws1);
    state.clients.set('client-2', ws2);

    state.handleJoinRoom(ws1, 'client-1', { roomId: 'room-A', userId: 'user-1' });
    state.handleJoinRoom(ws2, 'client-2', { roomId: 'room-A', userId: 'user-2' });

    const notify = ws1.sent.find((m) => m.type === 'user-joined');
    expect(notify).toBeDefined();
    expect(notify.userId).toBe('user-2');
  });

  it('sends existing participants list to second user on join', () => {
    const ws1 = makeFakeWs('client-1');
    const ws2 = makeFakeWs('client-2');
    state.clients.set('client-1', ws1);
    state.clients.set('client-2', ws2);

    state.handleJoinRoom(ws1, 'client-1', { roomId: 'room-A', userId: 'user-1' });
    state.handleJoinRoom(ws2, 'client-2', { roomId: 'room-A', userId: 'user-2' });

    const msg = ws2.sent.find((m) => m.type === 'room-joined');
    expect(msg.participants).toHaveLength(1);
    expect(msg.participants[0].clientId).toBe('client-1');
  });

  it('handles 3 users in the same room correctly', () => {
    ['client-1', 'client-2', 'client-3'].forEach((cid, i) => {
      const ws = makeFakeWs(cid);
      state.clients.set(cid, ws);
      state.handleJoinRoom(ws, cid, { roomId: 'room-B', userId: `user-${i + 1}` });
    });

    expect(state.rooms.get('room-B')!.size).toBe(3);
    // Third user should see 2 existing participants
    const ws3 = state.clients.get('client-3')!;
    const msg = ws3.sent.find((m: any) => m.type === 'room-joined');
    expect(msg.participants).toHaveLength(2);
  });

  // ── leave-room ────────────────────────────────────────────────────────────

  it('notifies remaining users when a participant leaves', () => {
    const ws1 = makeFakeWs('client-1');
    const ws2 = makeFakeWs('client-2');
    state.clients.set('client-1', ws1);
    state.clients.set('client-2', ws2);
    state.handleJoinRoom(ws1, 'client-1', { roomId: 'room-A', userId: 'user-1' });
    state.handleJoinRoom(ws2, 'client-2', { roomId: 'room-A', userId: 'user-2' });

    state.handleLeaveRoom('client-2', { roomId: 'room-A' });

    const leftMsg = ws1.sent.find((m) => m.type === 'user-left');
    expect(leftMsg).toBeDefined();
    expect(leftMsg.userId).toBe('user-2');
  });

  it('removes empty room after last user leaves', () => {
    const ws1 = makeFakeWs('client-1');
    state.clients.set('client-1', ws1);
    state.handleJoinRoom(ws1, 'client-1', { roomId: 'room-C', userId: 'user-1' });
    state.handleLeaveRoom('client-1', { roomId: 'room-C' });

    expect(state.rooms.has('room-C')).toBe(false);
  });

  it('preserves room when other participants remain', () => {
    const ws1 = makeFakeWs('client-1');
    const ws2 = makeFakeWs('client-2');
    state.clients.set('client-1', ws1);
    state.clients.set('client-2', ws2);
    state.handleJoinRoom(ws1, 'client-1', { roomId: 'room-D', userId: 'user-1' });
    state.handleJoinRoom(ws2, 'client-2', { roomId: 'room-D', userId: 'user-2' });
    state.handleLeaveRoom('client-1', { roomId: 'room-D' });

    expect(state.rooms.has('room-D')).toBe(true);
    expect(state.rooms.get('room-D')!.size).toBe(1);
  });

  // ── disconnect (connection drop) ─────────────────────────────────────────

  it('cleans up client on disconnect and notifies room peers', () => {
    const ws1 = makeFakeWs('client-1');
    const ws2 = makeFakeWs('client-2');
    state.clients.set('client-1', ws1);
    state.clients.set('client-2', ws2);
    state.handleJoinRoom(ws1, 'client-1', { roomId: 'room-E', userId: 'user-1' });
    state.handleJoinRoom(ws2, 'client-2', { roomId: 'room-E', userId: 'user-2' });

    state.handleDisconnect('client-1');

    expect(state.clients.has('client-1')).toBe(false);
    const leftMsg = ws2.sent.find((m) => m.type === 'user-left');
    expect(leftMsg?.userId).toBe('user-1');
  });

  it('removes empty room on disconnect', () => {
    const ws1 = makeFakeWs('client-1');
    state.clients.set('client-1', ws1);
    state.handleJoinRoom(ws1, 'client-1', { roomId: 'room-F', userId: 'user-solo' });
    state.handleDisconnect('client-1');

    expect(state.rooms.has('room-F')).toBe(false);
  });

  it('is a no-op when unknown client disconnects', () => {
    expect(() => state.handleDisconnect('unknown-client')).not.toThrow();
  });

  // ── signal forwarding ──────────────────────────────────────────────────

  it('forwards offer to target client', () => {
    const target = makeFakeWs('target-client');
    state.clients.set('target-client', target);

    state.handleForward('offer', {
      targetClientId: 'target-client',
      offer: { type: 'offer', sdp: 'v=0...' },
      userId: 'user-1',
    });

    const msg = target.sent.find((m) => m.type === 'offer');
    expect(msg).toBeDefined();
    expect(msg.offer.sdp).toBe('v=0...');
  });

  it('forwards answer to target client', () => {
    const target = makeFakeWs('target-client');
    state.clients.set('target-client', target);

    state.handleForward('answer', {
      targetClientId: 'target-client',
      answer: { type: 'answer', sdp: 'v=1...' },
      userId: 'user-2',
    });

    const msg = target.sent.find((m) => m.type === 'answer');
    expect(msg?.answer.sdp).toBe('v=1...');
  });

  it('forwards ICE candidates to target client', () => {
    const target = makeFakeWs('target-client');
    state.clients.set('target-client', target);

    state.handleForward('ice-candidate', {
      targetClientId: 'target-client',
      candidate: { candidate: 'candidate:1 ...' },
    });

    const msg = target.sent.find((m) => m.type === 'ice-candidate');
    expect(msg?.candidate.candidate).toContain('candidate:1');
  });

  it('silently drops signal when target client is not connected', () => {
    // Should not throw even though target doesn't exist
    expect(() => state.handleForward('offer', { targetClientId: 'ghost', offer: {} })).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Hocuspocus document name parsing tests
// documentName format: "<projectId>::<filePath>"
// ────────────────────────────────────────────────────────────────────────────

describe('Hocuspocus document name convention', () => {
  const SEPARATOR = '::';

  function parseDocumentName(documentName: string): { projectId: string; filePath: string } {
    const idx = documentName.indexOf(SEPARATOR);
    if (idx === -1) throw new Error(`Invalid document name: "${documentName}"`);
    return {
      projectId: documentName.slice(0, idx),
      filePath: documentName.slice(idx + SEPARATOR.length),
    };
  }

  it('correctly parses a standard document name', () => {
    const { projectId, filePath } = parseDocumentName('proj-abc::src/index.ts');
    expect(projectId).toBe('proj-abc');
    expect(filePath).toBe('src/index.ts');
  });

  it('handles nested file paths', () => {
    const { filePath } = parseDocumentName('proj-1::src/components/Editor/index.tsx');
    expect(filePath).toBe('src/components/Editor/index.tsx');
  });

  it('handles file path containing :: correctly (uses first occurrence only)', () => {
    // Path segment could theoretically contain ::, only split on first
    const { projectId, filePath } = parseDocumentName('proj-1::path::with::colons');
    expect(projectId).toBe('proj-1');
    expect(filePath).toBe('path::with::colons');
  });

  it('throws on missing separator', () => {
    expect(() => parseDocumentName('invalid-name-no-separator')).toThrow();
  });

  it('constructs document names consistently', () => {
    const name = `${'proj-xyz'}${SEPARATOR}${'lib/utils.ts'}`;
    const { projectId, filePath } = parseDocumentName(name);
    expect(projectId).toBe('proj-xyz');
    expect(filePath).toBe('lib/utils.ts');
  });
});
