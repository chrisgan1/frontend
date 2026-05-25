import { create } from 'zustand';
import { Track, SearchResult, Playlist, DownloadStatus, View } from '../types';

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  queue: Track[];
  queueIndex: number;
}

interface AppState {
  // View
  view: View;
  setView: (v: View) => void;

  // Search
  searchResults: SearchResult[];
  searchQuery: string;
  isSearching: boolean;
  setSearchResults: (r: SearchResult[]) => void;
  setSearchQuery: (q: string) => void;
  setIsSearching: (v: boolean) => void;

  // Library
  library: Track[];
  setLibrary: (tracks: Track[]) => void;
  addToLibrary: (track: Track) => void;
  removeFromLibrary: (id: string) => void;

  // Playlists
  playlists: Playlist[];
  setPlaylists: (p: Playlist[]) => void;
  addPlaylist: (p: Playlist) => void;
  removePlaylist: (id: string) => void;
  updatePlaylist: (p: Playlist) => void;

  // Downloads
  downloads: Record<string, DownloadStatus>;
  setDownloadStatus: (videoId: string, status: DownloadStatus) => void;

  // Player
  player: PlayerState;
  setCurrentTrack: (track: Track | null) => void;
  setIsPlaying: (v: boolean) => void;
  setProgress: (v: number) => void;
  setDuration: (v: number) => void;
  setVolume: (v: number) => void;
  playTrack: (track: Track, queue?: Track[]) => void;
  playNext: () => void;
  playPrev: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  view: 'search',
  setView: (v) => set({ view: v }),

  searchResults: [],
  searchQuery: '',
  isSearching: false,
  setSearchResults: (r) => set({ searchResults: r }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setIsSearching: (v) => set({ isSearching: v }),

  library: [],
  setLibrary: (tracks) => set({ library: tracks }),
  addToLibrary: (track) =>
    set((s) => ({
      library: s.library.some((t) => t.id === track.id) ? s.library : [track, ...s.library],
    })),
  removeFromLibrary: (id) =>
    set((s) => ({ library: s.library.filter((t) => t.id !== id) })),

  playlists: [],
  setPlaylists: (p) => set({ playlists: p }),
  addPlaylist: (p) => set((s) => ({ playlists: [p, ...s.playlists] })),
  removePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
  updatePlaylist: (updated) =>
    set((s) => ({ playlists: s.playlists.map((p) => (p.id === updated.id ? updated : p)) })),

  downloads: {},
  setDownloadStatus: (videoId, status) =>
    set((s) => ({ downloads: { ...s.downloads, [videoId]: status } })),

  player: {
    currentTrack: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.8,
    queue: [],
    queueIndex: 0,
  },

  setCurrentTrack: (track) =>
    set((s) => ({ player: { ...s.player, currentTrack: track, progress: 0 } })),
  setIsPlaying: (v) => set((s) => ({ player: { ...s.player, isPlaying: v } })),
  setProgress: (v) => set((s) => ({ player: { ...s.player, progress: v } })),
  setDuration: (v) => set((s) => ({ player: { ...s.player, duration: v } })),
  setVolume: (v) => set((s) => ({ player: { ...s.player, volume: v } })),

  playTrack: (track, queue) => {
    const q = queue || [track];
    const idx = q.findIndex((t) => t.id === track.id);
    set((s) => ({
      player: {
        ...s.player,
        currentTrack: track,
        isPlaying: true,
        progress: 0,
        queue: q,
        queueIndex: idx >= 0 ? idx : 0,
      },
    }));
  },

  playNext: () => {
    const { player } = get();
    if (!player.queue.length) return;
    const nextIdx = (player.queueIndex + 1) % player.queue.length;
    const next = player.queue[nextIdx];
    set((s) => ({
      player: { ...s.player, currentTrack: next, isPlaying: true, progress: 0, queueIndex: nextIdx },
    }));
  },

  playPrev: () => {
    const { player } = get();
    if (!player.queue.length) return;
    const prevIdx = (player.queueIndex - 1 + player.queue.length) % player.queue.length;
    const prev = player.queue[prevIdx];
    set((s) => ({
      player: { ...s.player, currentTrack: prev, isPlaying: true, progress: 0, queueIndex: prevIdx },
    }));
  },
}));
