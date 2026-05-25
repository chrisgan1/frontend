import { useState } from 'react';
import { Home, Search, Library, Plus, Music2, Trash2, ListMusic } from 'lucide-react';
import { useStore } from '../store/useStore';
import { createPlaylist, deletePlaylist } from '../api';
import { View } from '../types';

export default function Sidebar() {
  const { view, setView, playlists, addPlaylist, removePlaylist } = useStore();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const isActive = (v: View) => JSON.stringify(view) === JSON.stringify(v);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const pl = await createPlaylist(newName.trim());
      addPlaylist(pl);
      setNewName('');
      setCreating(false);
    } catch {}
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePlaylist(id);
      removePlaylist(id);
      if (isActive({ type: 'playlist', id })) setView('library');
    } catch {}
  };

  return (
    <aside className="w-60 bg-black flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-groove-green rounded-full flex items-center justify-center">
            <Music2 size={16} className="text-black" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Groove</span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="px-3 mb-4">
        <button
          onClick={() => setView('search')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive('search')
              ? 'text-white bg-groove-surface2'
              : 'text-groove-muted hover:text-white'
          }`}
        >
          <Search size={18} />
          Search
        </button>
        <button
          onClick={() => setView('library')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive('library')
              ? 'text-white bg-groove-surface2'
              : 'text-groove-muted hover:text-white'
          }`}
        >
          <Library size={18} />
          Your Library
        </button>
      </nav>

      {/* Playlists */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-groove-muted text-xs font-semibold uppercase tracking-wider">
            Playlists
          </span>
          <button
            onClick={() => setCreating(true)}
            className="text-groove-muted hover:text-white transition-colors"
            title="New playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {creating && (
          <div className="mb-2 px-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setCreating(false); setNewName(''); }
              }}
              placeholder="Playlist name…"
              className="w-full bg-groove-surface2 text-white text-sm px-3 py-1.5 rounded outline-none border border-groove-subtle focus:border-groove-green"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={handleCreate}
                className="flex-1 text-xs bg-groove-green text-black font-semibold py-1 rounded hover:bg-groove-green-light transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(''); }}
                className="flex-1 text-xs bg-groove-surface2 text-groove-muted py-1 rounded hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => setView({ type: 'playlist', id: pl.id })}
            className={`group w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
              isActive({ type: 'playlist', id: pl.id })
                ? 'text-white bg-groove-surface2'
                : 'text-groove-muted hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ListMusic size={15} className="shrink-0" />
              <span className="truncate">{pl.name}</span>
            </div>
            <button
              onClick={(e) => handleDelete(pl.id, e)}
              className="opacity-0 group-hover:opacity-100 text-groove-subtle hover:text-red-400 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </button>
        ))}

        {playlists.length === 0 && !creating && (
          <p className="text-groove-subtle text-xs px-3 mt-1">
            Create your first playlist
          </p>
        )}
      </div>
    </aside>
  );
}
