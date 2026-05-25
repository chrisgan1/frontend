import { useState } from 'react';
import { Play, Download, Plus, Check, Loader2, Trash2, Music } from 'lucide-react';
import { useStore } from '../store/useStore';
import { SearchResult, Track } from '../types';
import { startDownload, getDownloadStatus, addTrackToPlaylist, getPlaylists, deleteTrack } from '../api';
import { formatDuration } from '../utils';

interface Props {
  item: SearchResult | Track;
  isLibrary?: boolean;
  playlistId?: string;
  onRemoveFromPlaylist?: (trackId: string) => void;
  queue?: Track[];
}

function isTrack(item: SearchResult | Track): item is Track {
  return 'filename' in item;
}

export default function TrackRow({ item, isLibrary, playlistId, onRemoveFromPlaylist, queue }: Props) {
  const { downloads, setDownloadStatus, addToLibrary, removeFromLibrary, playTrack, player, playlists, setPlaylists } = useStore();
  const [showPlaylists, setShowPlaylists] = useState(false);

  const videoId = isTrack(item) ? item.video_id : item.videoId;
  const dlStatus = downloads[videoId] || { status: 'idle' };
  const isCurrentTrack = player.currentTrack?.video_id === videoId;

  const pollStatus = (vid: string, meta: SearchResult) => {
    const interval = setInterval(async () => {
      try {
        const status = await getDownloadStatus(vid);
        if (status.status === 'complete' && status.track) {
          clearInterval(interval);
          setDownloadStatus(vid, status);
          addToLibrary(status.track);
        } else if (status.status === 'downloading') {
          setDownloadStatus(vid, status);
        } else if ((status as { status: string }).status === 'not_started') {
          clearInterval(interval);
          setDownloadStatus(vid, { status: 'error', message: 'Download failed' });
        }
      } catch {
        clearInterval(interval);
      }
    }, 800);
  };

  const handlePlay = async () => {
    if (isTrack(item)) {
      const q = queue || [item];
      playTrack(item, q);
      return;
    }

    // Search result — download first, then play
    if (dlStatus.status === 'complete' && dlStatus.track) {
      const q = queue as Track[] | undefined;
      playTrack(dlStatus.track, q);
      return;
    }

    if (dlStatus.status === 'downloading') return;

    setDownloadStatus(videoId, { status: 'downloading', progress: 0 });
    try {
      const result = await startDownload({
        videoId: item.videoId,
        title: item.title,
        artist: item.artist,
        duration: item.duration,
        thumbnail: item.thumbnail,
      });
      if (result.status === 'exists' && result.track) {
        setDownloadStatus(videoId, { status: 'complete', track: result.track });
        addToLibrary(result.track);
        playTrack(result.track);
      } else {
        pollStatus(videoId, item);
        // auto-play when done
        const waitAndPlay = setInterval(() => {
          const s = useStore.getState().downloads[videoId];
          if (s?.status === 'complete' && s.track) {
            clearInterval(waitAndPlay);
            playTrack(s.track);
          }
        }, 500);
      }
    } catch {
      setDownloadStatus(videoId, { status: 'error', message: 'Failed' });
    }
  };

  const handleSave = async () => {
    if (isTrack(item) || dlStatus.status === 'complete' || dlStatus.status === 'downloading') return;

    setDownloadStatus(videoId, { status: 'downloading', progress: 0 });
    try {
      const result = await startDownload({
        videoId: (item as SearchResult).videoId,
        title: item.title,
        artist: item.artist,
        duration: item.duration,
        thumbnail: item.thumbnail,
      });
      if (result.status === 'exists' && result.track) {
        setDownloadStatus(videoId, { status: 'complete', track: result.track });
        addToLibrary(result.track);
      } else {
        pollStatus(videoId, item as SearchResult);
      }
    } catch {
      setDownloadStatus(videoId, { status: 'error', message: 'Failed' });
    }
  };

  const handleDelete = async () => {
    if (!isTrack(item)) return;
    try {
      await deleteTrack(item.id);
      removeFromLibrary(item.id);
    } catch {}
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    const trackId = isTrack(item)
      ? item.id
      : (downloads[videoId]?.status === 'complete' && downloads[videoId]?.track?.id) || null;
    if (!trackId) return;
    try {
      await addTrackToPlaylist(playlistId, trackId);
      const updated = await getPlaylists();
      setPlaylists(updated);
      setShowPlaylists(false);
    } catch {}
  };

  const isSaved = isTrack(item) || dlStatus.status === 'complete';
  const isDownloading = dlStatus.status === 'downloading';
  const progress = isDownloading ? (dlStatus as { status: 'downloading'; progress: number }).progress : 0;

  return (
    <div
      className={`group flex items-center gap-3 px-4 py-2 rounded-md transition-colors hover:bg-groove-surface2 ${
        isCurrentTrack ? 'bg-groove-surface2' : ''
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-10 h-10 shrink-0">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt=""
            className="w-10 h-10 rounded object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded bg-groove-surface3 flex items-center justify-center">
            <Music size={14} className="text-groove-subtle" />
          </div>
        )}
        <button
          onClick={handlePlay}
          className={`absolute inset-0 flex items-center justify-center rounded transition-opacity ${
            isCurrentTrack && player.isPlaying
              ? 'opacity-100 bg-black/60'
              : 'opacity-0 group-hover:opacity-100 bg-black/60'
          }`}
        >
          {isDownloading ? (
            <Loader2 size={16} className="text-groove-green animate-spin" />
          ) : (
            <Play size={16} className={`text-white fill-white ${isCurrentTrack ? 'text-groove-green fill-groove-green' : ''}`} />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-groove-green' : 'text-white'}`}>
          {item.title}
        </p>
        <p className="text-xs text-groove-muted truncate">{item.artist}</p>
        {isDownloading && (
          <div className="mt-1 h-0.5 bg-groove-surface3 rounded-full overflow-hidden w-full">
            <div
              className="h-full bg-groove-green transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Duration */}
      <span className="text-xs text-groove-muted shrink-0 w-10 text-right">
        {formatDuration(item.duration)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isLibrary && !isTrack(item) && (
          <button
            onClick={handleSave}
            title={isSaved ? 'Saved' : 'Save to library'}
            className={`p-1.5 rounded-full transition-colors ${
              isSaved
                ? 'text-groove-green'
                : 'text-groove-muted hover:text-white'
            }`}
          >
            {isDownloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isSaved ? (
              <Check size={14} />
            ) : (
              <Download size={14} />
            )}
          </button>
        )}

        {/* Add to playlist */}
        <div className="relative">
          <button
            onClick={() => setShowPlaylists(!showPlaylists)}
            title="Add to playlist"
            className="p-1.5 rounded-full text-groove-muted hover:text-white transition-colors"
          >
            <Plus size={14} />
          </button>
          {showPlaylists && (
            <div className="absolute right-0 bottom-full mb-1 w-48 bg-groove-surface3 rounded-lg shadow-xl z-50 py-1 border border-white/10">
              {playlists.length === 0 ? (
                <p className="text-groove-muted text-xs px-3 py-2">No playlists yet</p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleAddToPlaylist(pl.id)}
                    className="w-full text-left px-3 py-2 text-sm text-groove-muted hover:text-white hover:bg-groove-surface2 transition-colors"
                  >
                    {pl.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {isLibrary && (
          <button
            onClick={handleDelete}
            title="Remove from library"
            className="p-1.5 rounded-full text-groove-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}

        {playlistId && onRemoveFromPlaylist && isTrack(item) && (
          <button
            onClick={() => onRemoveFromPlaylist(item.id)}
            title="Remove from playlist"
            className="p-1.5 rounded-full text-groove-muted hover:text-red-400 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
