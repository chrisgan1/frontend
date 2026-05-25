import { useState } from 'react';
import { ListMusic, Pencil, Check, X, Music } from 'lucide-react';
import { useStore } from '../store/useStore';
import { renamePlaylist, removeTrackFromPlaylist, getPlaylists } from '../api';
import TrackRow from './TrackRow';

interface Props { playlistId: string; }

export default function PlaylistView({ playlistId }: Props) {
  const { playlists, updatePlaylist, setPlaylists } = useStore();
  const playlist = playlists.find((p) => p.id === playlistId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(playlist?.name || '');

  if (!playlist) return (
    <div className="flex items-center justify-center h-full text-groove-muted">
      Playlist not found
    </div>
  );

  const handleRename = async () => {
    if (!name.trim()) return;
    try {
      await renamePlaylist(playlist.id, name.trim());
      updatePlaylist({ ...playlist, name: name.trim() });
      setEditing(false);
    } catch {}
  };

  const handleRemove = async (trackId: string) => {
    try {
      await removeTrackFromPlaylist(playlist.id, trackId);
      const updated = await getPlaylists();
      setPlaylists(updated);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-groove-surface2 rounded-lg flex items-center justify-center shrink-0">
            <ListMusic size={28} className="text-groove-green" />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') { setEditing(false); setName(playlist.name); }
                  }}
                  className="bg-groove-surface2 text-white text-xl font-bold px-2 py-1 rounded outline-none border border-groove-subtle focus:border-groove-green"
                />
                <button onClick={handleRename} className="text-groove-green hover:text-groove-green-light">
                  <Check size={18} />
                </button>
                <button onClick={() => { setEditing(false); setName(playlist.name); }} className="text-groove-muted hover:text-white">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-2xl font-bold text-white truncate">{playlist.name}</h1>
                <button
                  onClick={() => setEditing(true)}
                  className="opacity-0 group-hover:opacity-100 text-groove-muted hover:text-white transition-all"
                >
                  <Pencil size={15} />
                </button>
              </div>
            )}
            <p className="text-groove-muted text-sm mt-0.5">
              {playlist.tracks.length} {playlist.tracks.length === 1 ? 'song' : 'songs'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {playlist.tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-groove-subtle">
            <Music size={36} className="mb-3 opacity-30" />
            <p className="text-sm text-groove-muted">Add songs from search or your library</p>
          </div>
        ) : (
          playlist.tracks.map((track) => (
            <TrackRow
              key={track.id}
              item={track}
              playlistId={playlist.id}
              onRemoveFromPlaylist={handleRemove}
              queue={playlist.tracks}
            />
          ))
        )}
      </div>
    </div>
  );
}
