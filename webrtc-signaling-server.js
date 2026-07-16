/**
 * WebRTC Signaling Server for CodeBridge Video Conferencing
 * 
 * This server handles WebRTC signaling for peer-to-peer video calls
 * using WebSocket for real-time communication.
 * 
 * Run: node webrtc-signaling-server.js
 * Listens on: ws://localhost:3001
 */

const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const rooms = new Map();
const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientId = req.headers['sec-websocket-key'];
    clients.set(clientId, ws);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'join-room':
                    handleJoinRoom(ws, clientId, data);
                    break;
                case 'offer':
                    handleOffer(data);
                    break;
                case 'answer':
                    handleAnswer(data);
                    break;
                case 'ice-candidate':
                    handleIceCandidate(data);
                    break;
                case 'leave-room':
                    handleLeaveRoom(clientId, data);
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });
    
    ws.on('close', () => {
        handleDisconnect(clientId);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

function handleJoinRoom(ws, clientId, data) {
    const { roomId, userId } = data;
    
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    
    const room = rooms.get(roomId);
    room.add(clientId);
    
    // Store user info
    ws.userId = userId;
    ws.roomId = roomId;
    
    // Notify other participants
    const participants = Array.from(room).filter(id => id !== clientId);
    participants.forEach(participantId => {
        const participantWs = clients.get(participantId);
        if (participantWs && participantWs.readyState === WebSocket.OPEN) {
            participantWs.send(JSON.stringify({
                type: 'user-joined',
                userId,
                clientId
            }));
        }
    });
    
    // Send current participants to new user
    ws.send(JSON.stringify({
        type: 'room-joined',
        roomId,
        participants: participants.map(id => ({
            clientId: id,
            userId: clients.get(id)?.userId
        }))
    }));
    
    console.log(`User ${userId} joined room ${roomId}`);
}

function handleOffer(data) {
    const { targetClientId, offer, userId } = data;
    const targetWs = clients.get(targetClientId);
    
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'offer',
            offer,
            userId,
            sourceClientId: data.sourceClientId
        }));
    }
}

function handleAnswer(data) {
    const { targetClientId, answer, userId } = data;
    const targetWs = clients.get(targetClientId);
    
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'answer',
            answer,
            userId,
            sourceClientId: data.sourceClientId
        }));
    }
}

function handleIceCandidate(data) {
    const { targetClientId, candidate, userId } = data;
    const targetWs = clients.get(targetClientId);
    
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
            type: 'ice-candidate',
            candidate,
            userId,
            sourceClientId: data.sourceClientId
        }));
    }
}

function handleLeaveRoom(clientId, data) {
    const ws = clients.get(clientId);
    if (!ws) return;
    
    const { roomId } = data;
    const room = rooms.get(roomId);
    
    if (room) {
        room.delete(clientId);
        
        // Notify other participants
        room.forEach(participantId => {
            const participantWs = clients.get(participantId);
            if (participantWs && participantWs.readyState === WebSocket.OPEN) {
                participantWs.send(JSON.stringify({
                    type: 'user-left',
                    userId: ws.userId,
                    clientId
                }));
            }
        });
        
        // Clean up empty rooms
        if (room.size === 0) {
            rooms.delete(roomId);
        }
    }
    
    console.log(`User ${ws.userId} left room ${roomId}`);
}

function handleDisconnect(clientId) {
    const ws = clients.get(clientId);
    if (!ws) return;
    
    const { roomId, userId } = ws;
    
    if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
            room.delete(clientId);
            
            // Notify other participants
            room.forEach(participantId => {
                const participantWs = clients.get(participantId);
                if (participantWs && participantWs.readyState === WebSocket.OPEN) {
                    participantWs.send(JSON.stringify({
                        type: 'user-left',
                        userId,
                        clientId
                    }));
                }
            });
            
            if (room.size === 0) {
                rooms.delete(roomId);
            }
        }
    }
    
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
}

const PORT = process.env.WS_PORT || 3001;
server.listen(PORT, () => {
    console.log(`WebRTC Signaling Server running on ws://localhost:${PORT}`);
});
