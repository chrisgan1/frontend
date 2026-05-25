export interface Track {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  filename: string;
  added_at: number;
}

export interface SearchResult {
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

export interface Playlist {
  id: string;
  name: string;
  created_at: number;
  tracks: Track[];
}

export type DownloadStatus =
  | { status: 'idle' }
  | { status: 'downloading'; progress: number }
  | { status: 'complete'; track: Track }
  | { status: 'error'; message: string };

export type View = 'search' | 'library' | { type: 'playlist'; id: string };
