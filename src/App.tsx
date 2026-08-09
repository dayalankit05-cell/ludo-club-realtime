import React, { useEffect, useRef, useState } from 'react';
import {
  ClientMessage,
  GameState,
  PlayerColor,
  ServerMessage,
} from './types';
import { LudoBoard } from './components/LudoBoard';
import { PlayerCard } from './components/PlayerCard';
import { RoomLobby } from './components/RoomLobby';
import { ChatPanel } from './components/ChatPanel';
import { VictoryModal } from './components/VictoryModal';
import { playSound } from './lib/audio';
import { Dices, LogOut, Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [isWsConnected, setIsWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize WebSocket connection with reconnect logic
  useEffect(() => {
    let isComponentMounted = true;

    function connectWs() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isComponentMounted) return;
          console.log('Connected to Ludo Real-Time Server');
          setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isComponentMounted) return;
          try {
            const msg: ServerMessage = JSON.parse(event.data);

            switch (msg.type) {
              case 'ROOM_STATE':
                setGameState(msg.state);
                if (msg.myColor) setMyColor(msg.myColor);
                setErrorMsg(null);
                break;

              case 'ERROR':
                setErrorMsg(msg.message);
                setTimeout(() => setErrorMsg(null), 4000);
                break;

              case 'SOUND_EVENT':
                if (!isMuted && playSound[msg.sound]) {
                  playSound[msg.sound]();
                }
                break;
            }
          } catch (err) {
            console.error('WebSocket message parsing error:', err);
          }
        };

        ws.onerror = () => {
          if (!isComponentMounted) return;
          setIsWsConnected(false);
        };

        ws.onclose = () => {
          if (!isComponentMounted) return;
          setIsWsConnected(false);
          // Try reconnecting after 2 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isComponentMounted) connectWs();
          }, 2000);
        };
      } catch (e) {
        setIsWsConnected(false);
      }
    }

    connectWs();

    return () => {
      isComponentMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [isMuted]);

  // Polling fallback when in a room and WS is disconnected
  useEffect(() => {
    if (!gameState?.roomId || isWsConnected) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/room/${gameState.roomId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            setGameState(data.state);
          }
        }
      } catch (err) {
        // ignore polling error
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [gameState?.roomId, isWsConnected]);

  const sendMsg = async (msg: ClientMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
      return;
    }

    // HTTP REST Fallback if WebSocket is not open
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg, color: myColor }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to perform action');
        setTimeout(() => setErrorMsg(null), 4000);
      } else if (data.state) {
        setGameState(data.state);
        if (data.myColor) setMyColor(data.myColor);
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const handleCreateRoom = (playerName: string, preferredColor: PlayerColor) => {
    sendMsg({ type: 'CREATE_ROOM', playerName, preferredColor });
  };

  const handleJoinRoom = (roomId: string, playerName: string, preferredColor: PlayerColor) => {
    sendMsg({ type: 'JOIN_ROOM', roomId, playerName, preferredColor });
  };

  const handleStartGame = () => {
    if (!gameState) return;
    sendMsg({ type: 'START_GAME', roomId: gameState.roomId });
  };

  const handleToggleBot = (color: PlayerColor) => {
    if (!gameState) return;
    sendMsg({ type: 'TOGGLE_BOT', roomId: gameState.roomId, color });
  };

  const handleRollDice = () => {
    if (!gameState) return;
    sendMsg({ type: 'ROLL_DICE', roomId: gameState.roomId });
  };

  const handleSelectToken = (tokenId: number) => {
    if (!gameState) return;
    sendMsg({ type: 'MOVE_TOKEN', roomId: gameState.roomId, tokenId });
  };

  const handleSendMessage = (text: string, emoji?: string) => {
    if (!gameState) return;
    sendMsg({ type: 'SEND_CHAT', roomId: gameState.roomId, text, emoji });
  };

  const handleRestartGame = () => {
    if (!gameState) return;
    sendMsg({ type: 'RESTART_GAME', roomId: gameState.roomId });
  };

  const handleLeaveRoom = () => {
    setGameState(null);
    setMyColor(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between font-sans selection:bg-amber-400 selection:text-slate-950 overflow-x-hidden relative">
      {/* Background Animated Gradient Mesh */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none z-0" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-5xl px-3 py-4 flex flex-col items-center gap-4 flex-1">
        {/* Top Navigation Bar */}
        <header className="w-full p-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-500 to-amber-400 p-0.5 shadow">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Dices className="w-4 h-4 text-amber-300" />
              </div>
            </div>
            <span className="font-black tracking-wider text-sm sm:text-base text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
              LUDO CLUB
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Leave Room Button */}
            {gameState && (
              <button
                type="button"
                onClick={handleLeaveRoom}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Leave
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Views: Lobby vs Playing */}
        {!gameState || gameState.status === 'LOBBY' ? (
          <RoomLobby
            gameState={gameState}
            myColor={myColor}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onStartGame={handleStartGame}
            onToggleBot={handleToggleBot}
            errorMsg={errorMsg}
          />
        ) : (
          <main className="w-full flex flex-col items-center gap-4 my-auto">
            {/* Game Action Ticker Bar */}
            <div className="w-full max-w-[620px] p-2.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs sm:text-sm font-bold text-center tracking-wide animate-fade">
              {gameState.lastActionText || '🎲 Match in Progress!'}
            </div>

            {/* Main Board & Players Layout */}
            <div className="w-full flex flex-col items-center gap-4">
              {/* Top 2 Player Cards (Red & Green) */}
              <div className="w-full max-w-[620px] grid grid-cols-2 gap-3">
                <PlayerCard
                  color="red"
                  gameState={gameState}
                  myColor={myColor}
                  onRollDice={handleRollDice}
                />
                <PlayerCard
                  color="green"
                  gameState={gameState}
                  myColor={myColor}
                  onRollDice={handleRollDice}
                />
              </div>

              {/* Ludo Board */}
              <LudoBoard
                gameState={gameState}
                myColor={myColor}
                onSelectToken={handleSelectToken}
              />

              {/* Bottom 2 Player Cards (Blue & Yellow) */}
              <div className="w-full max-w-[620px] grid grid-cols-2 gap-3">
                <PlayerCard
                  color="blue"
                  gameState={gameState}
                  myColor={myColor}
                  onRollDice={handleRollDice}
                />
                <PlayerCard
                  color="yellow"
                  gameState={gameState}
                  myColor={myColor}
                  onRollDice={handleRollDice}
                />
              </div>
            </div>

            {/* In-Game Real-Time Chat Panel */}
            <ChatPanel
              messages={gameState.chatMessages}
              onSendMessage={handleSendMessage}
            />
          </main>
        )}

        {/* Victory Celebration Modal */}
        {gameState && gameState.status === 'FINISHED' && (
          <VictoryModal
            gameState={gameState}
            onRestartGame={handleRestartGame}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full text-center py-2 text-[10px] text-white/40">
        Ludo Club Real-Time Multi-Device Engine • Built for 4-Player Glassmorphism Experience
      </footer>
    </div>
  );
}
