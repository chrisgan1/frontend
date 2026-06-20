import { useState, useEffect } from 'react';
import { socket, joinRoom, startGame } from '../socket';
import { useGameStore } from '../store/useGameStore';
import { PLAYER_COLORS } from '../constants';
import type { PlayerState } from '../types/game';

export default function LobbyUI() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [myRoomCode, setMyRoomCode] = useState('');
  const [error, setError] = useState('');

  const myId = useGameStore(s => s.myId);
  const setMyId = useGameStore(s => s.setMyId);

  useEffect(() => {
    const onJoined = ({ room, yourId }: { room: { players: PlayerState[]; roomCode: string }; yourId: string }) => {
      setInRoom(true);
      setPlayers(room.players);
      setMyRoomCode(room.roomCode);
      setMyId(yourId);
    };
    const onUpdated = ({ players: pl }: { players: PlayerState[] }) => setPlayers(pl);
    const onError = ({ message }: { message: string }) => setError(message);

    socket.on('room-joined', onJoined);
    socket.on('room-updated', onUpdated);
    socket.on('error', onError);
    return () => {
      socket.off('room-joined', onJoined);
      socket.off('room-updated', onUpdated);
      socket.off('error', onError);
    };
  }, [setMyId]);

  const handleJoin = () => {
    setError('');
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!roomCode.trim()) { setError('Enter a room code'); return; }
    joinRoom(roomCode.trim(), name.trim());
  };

  const handleCreate = () => {
    setError('');
    if (!name.trim()) { setError('Enter your name'); return; }
    joinRoom('', name.trim());
  };

  const isHost = players.find(p => p.id === myId)?.isHost;

  if (inRoom) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dream-bg">
        <div className="bg-dream-surface rounded-2xl p-8 w-96 border border-dream-accent/30 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-dream-text">PROP HUNT</h1>
            <div className="mt-1 text-dream-muted text-sm">
              Room:{' '}
              <span className="text-dream-gold font-mono font-bold text-xl tracking-widest">{myRoomCode}</span>
            </div>
          </div>

          <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-dream-bg/50 rounded-lg px-4 py-2.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PLAYER_COLORS[p.colorIndex] }} />
                <span className="text-dream-text text-sm flex-1">{p.name}</span>
                {p.isHost && <span className="text-dream-gold text-[10px] font-bold tracking-wide">HOST</span>}
                {p.id === myId && <span className="text-dream-muted text-[10px]">YOU</span>}
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={startGame}
              disabled={players.length < 2}
              className="w-full py-3 bg-dream-accent hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
            >
              {players.length < 2 ? 'Waiting for players…' : `Start Game (${players.length})`}
            </button>
          ) : (
            <div className="text-center text-dream-muted text-sm py-3">Waiting for the host to start…</div>
          )}

          <div className="mt-4 text-dream-muted/60 text-xs text-center leading-relaxed">
            Props hide · Hunters seek · Click to shoot
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-dream-bg">
      <div className="bg-dream-surface rounded-2xl p-8 w-96 border border-dream-accent/30 shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-dream-text mb-1">PROP HUNT</h1>
        <p className="text-center text-dream-muted text-sm mb-8">3D first-person · hide &amp; seek</p>

        {error && (
          <div className="bg-dream-red/10 border border-dream-red/40 text-dream-red text-sm rounded-lg px-4 py-2.5 mb-5">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            maxLength={16}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            className="w-full bg-dream-bg border border-dream-accent/30 focus:border-dream-accent text-dream-text placeholder-dream-muted/50 rounded-xl px-4 py-3 outline-none transition-colors"
          />

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Room code"
              maxLength={4}
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="flex-1 bg-dream-bg border border-dream-accent/30 focus:border-dream-accent text-dream-text placeholder-dream-muted/50 rounded-xl px-4 py-3 outline-none transition-colors font-mono uppercase tracking-widest"
            />
            <button
              onClick={handleJoin}
              className="px-5 py-3 bg-dream-teal/20 hover:bg-dream-teal/30 text-dream-teal border border-dream-teal/40 rounded-xl font-bold transition-colors"
            >
              JOIN
            </button>
          </div>

          <button
            onClick={handleCreate}
            className="w-full py-3 bg-dream-accent hover:bg-purple-500 text-white font-bold rounded-xl transition-colors"
          >
            CREATE ROOM
          </button>
        </div>
      </div>
    </div>
  );
}
