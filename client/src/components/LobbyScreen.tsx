import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { joinRoom, startGame } from '../socket';

export default function LobbyScreen() {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [joined, setJoined] = useState(false);
  const players = useGameStore((s) => s.players);
  const myId = useGameStore((s) => s.myId);
  const roomCode = useGameStore((s) => s.roomCode);

  const playerList = Object.values(players);
  const me = players[myId];
  const isHost = me?.isHost;

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    joinRoom(code.trim(), name.trim());
    setJoined(true);
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="bg-game-card border-2 border-game-border rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="font-game text-5xl text-center text-game-yellow mb-2">
          🛒 TROLLEY CHAOS
        </h1>
        <p className="text-center text-game-blue font-body mb-8 text-sm">
          Ram rivals · Steal items · Win the Clearance Sale
        </p>

        {!joined ? (
          <form onSubmit={handleJoin} className="space-y-4">
            <input
              className="w-full bg-game-bg border-2 border-game-border rounded-xl px-4 py-3 text-white font-body text-lg focus:border-game-accent outline-none"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={16}
              autoFocus
            />
            <input
              className="w-full bg-game-bg border-2 border-game-border rounded-xl px-4 py-3 text-white font-game text-2xl text-center tracking-widest uppercase focus:border-game-accent outline-none"
              placeholder="ROOM CODE"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button
              type="submit"
              className="w-full bg-game-accent hover:bg-red-500 text-white font-game text-2xl py-3 rounded-xl transition-all active:scale-95 shadow-lg"
            >
              JOIN ROOM
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-game-bg rounded-xl p-4 text-center">
              <p className="text-game-blue font-body text-sm mb-1">Room Code</p>
              <p className="font-game text-4xl text-game-yellow tracking-widest">{roomCode}</p>
            </div>

            <div className="bg-game-bg rounded-xl p-4">
              <p className="text-game-blue font-body text-sm mb-2">Players ({playerList.length}/4)</p>
              <div className="space-y-2">
                {playerList.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: p.colorHex }}
                    />
                    <span className="font-body font-bold text-white">
                      {p.name}
                      {p.id === myId && ' (you)'}
                      {p.isHost && ' 👑'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isHost ? (
              <button
                onClick={startGame}
                disabled={playerList.length < 2}
                className="w-full bg-game-green hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-game text-2xl py-3 rounded-xl transition-all active:scale-95 shadow-lg"
              >
                {playerList.length < 2 ? 'Need 2+ players' : 'START GAME'}
              </button>
            ) : (
              <p className="text-center text-game-blue font-body">
                Waiting for host to start...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
