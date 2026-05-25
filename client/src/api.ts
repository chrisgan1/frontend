import { Track, SearchResult, Playlist, DownloadStatus } from './types';

const BASE = '/api';

export async function searchYouTube(q: string): Promise<SearchResult[]> {
  const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function startDownload(params: {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}): Promise<{ status: string; track?: Track; trackId?: string }> {
  const res = await fetch(`${BASE}/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Download request failed');
  return res.json();
}

export async function getDownloadStatus(videoId: string): Promise<DownloadStatus> {
  const res = await fetch(`${BASE}/download/status/${videoId}`);
  if (!res.ok) throw new Error('Status check failed');
  const data = await res.json();
  return data as DownloadStatus;
}

export async function getLibrary(): Promise<Track[]> {
  const res = await fetch(`${BASE}/library`);
  if (!res.ok) throw new Error('Failed to fetch library');
  return res.json();
}

export async function deleteTrack(id: string): Promise<void> {
  await fetch(`${BASE}/library/${id}`, { method: 'DELETE' });
}

export async function getPlaylists(): Promise<Playlist[]> {
  const res = await fetch(`${BASE}/playlists`);
  if (!res.ok) throw new Error('Failed to fetch playlists');
  return res.json();
}

export async function createPlaylist(name: string): Promise<Playlist> {
  const res = await fetch(`${BASE}/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create playlist');
  return res.json();
}

export async function deletePlaylist(id: string): Promise<void> {
  await fetch(`${BASE}/playlists/${id}`, { method: 'DELETE' });
}

export async function renamePlaylist(id: string, name: string): Promise<void> {
  await fetch(`${BASE}/playlists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function addTrackToPlaylist(playlistId: string, trackId: string): Promise<void> {
  await fetch(`${BASE}/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackId }),
  });
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  await fetch(`${BASE}/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' });
}

export function audioUrl(filename: string): string {
  return `${BASE}/library/audio/${filename}`;
}
