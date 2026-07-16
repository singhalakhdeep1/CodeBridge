'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { 
  Video, VideoOff, Mic, MicOff, Phone, PhoneOff, 
  ScreenShare, MonitorStop, MessageSquare, Users, Settings
} from 'lucide-react';

interface VideoConferencingProps {
  roomId: string;
  onEnd?: () => void;
}

export default function VideoConferencing({ roomId, onEnd }: VideoConferencingProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    initializeLocalStream();
    return () => {
      cleanup();
    };
  }, []);

  const initializeLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (localStream) {
          const videoTrack = screenStream.getVideoTracks()[0];
          localStream.addTrack(videoTrack);
          
          videoTrack.onended = () => {
            stopScreenShare();
          };
        }
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    }
  };

  const stopScreenShare = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        if (track.label.includes('screen')) {
          localStream.removeTrack(track);
          track.stop();
        }
      });
    }
    setIsScreenSharing(false);
  };

  const joinRoom = async () => {
    try {
      const ws = new WebSocket('ws://localhost:3001');
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId,
          userId: 'current-user'
        }));
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'room-joined':
            setIsConnected(true);
            setParticipants(data.participants.map((p: any) => p.userId));
            break;
          case 'user-joined':
            setParticipants(prev => [...prev, data.userId]);
            break;
          case 'user-left':
            setParticipants(prev => prev.filter(id => id !== data.userId));
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
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
      };
      
      // Store WebSocket ref for cleanup
      (ws as any).roomId = roomId;
      peerConnections.current.set('signaling', ws as any);
      
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  const leaveRoom = () => {
    cleanup();
    onEnd?.();
  };

  const handleOffer = async (data: any) => {
    const { offer, sourceClientId } = data;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    peerConnections.current.set(sourceClientId, pc);
    
    localStream?.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });
    
    pc.ontrack = (event) => {
      setRemoteStreams(prev => new Map(prev).set(sourceClientId, event.streams[0]));
    };
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const signalingWs = peerConnections.current.get('signaling');
        if (signalingWs?.readyState === WebSocket.OPEN) {
          signalingWs.send(JSON.stringify({
            type: 'ice-candidate',
            candidate: event.candidate,
            targetClientId: sourceClientId
          }));
        }
      }
    };
    
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    const signalingWs = peerConnections.current.get('signaling');
    if (signalingWs?.readyState === WebSocket.OPEN) {
      signalingWs.send(JSON.stringify({
        type: 'answer',
        answer,
        targetClientId: sourceClientId
      }));
    }
  };

  const handleAnswer = async (data: any) => {
    const { answer, sourceClientId } = data;
    const pc = peerConnections.current.get(sourceClientId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  };

  const handleIceCandidate = async (data: any) => {
    const { candidate, sourceClientId } = data;
    const pc = peerConnections.current.get(sourceClientId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    
    setRemoteStreams(new Map());
    setIsConnected(false);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Video Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4">
        {/* Local Video */}
        <div className="relative bg-muted rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
            You
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <VideoOff className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
          <div key={userId} className="relative bg-muted rounded-lg overflow-hidden">
            <video
              ref={(el) => {
                if (el) remoteVideoRefs.current.set(userId, el);
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
              srcObject={stream}
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
              {userId}
            </div>
          </div>
        ))}

        {/* Placeholder for empty slots */}
        {remoteStreams.size < 3 && Array.from({ length: 3 - remoteStreams.size }).map((_, i) => (
          <div key={i} className="bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2" />
              <p>Waiting for participants...</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="border-t bg-muted/50 p-4">
        <div className="flex items-center justify-center gap-2">
          {!isConnected ? (
            <Button onClick={joinRoom} size="lg">
              <Phone className="w-5 h-5 mr-2" />
              Join Room
            </Button>
          ) : (
            <>
              <Button
                variant={isVideoEnabled ? 'default' : 'destructive'}
                size="lg"
                onClick={toggleVideo}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isAudioEnabled ? 'default' : 'destructive'}
                size="lg"
                onClick={toggleAudio}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? 'destructive' : 'default'}
                size="lg"
                onClick={toggleScreenShare}
              >
                {isScreenSharing ? <MonitorStop className="w-5 h-5" /> : <ScreenShare className="w-5 h-5" />}
              </Button>

              <Button variant="default" size="lg">
                <MessageSquare className="w-5 h-5" />
              </Button>

              <Button variant="default" size="lg">
                <Users className="w-5 h-5" />
              </Button>

              <Button variant="default" size="lg">
                <Settings className="w-5 h-5" />
              </Button>

              <Button variant="destructive" size="lg" onClick={leaveRoom}>
                <PhoneOff className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
