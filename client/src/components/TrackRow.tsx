import { useState } from 'react';
import { Play, Download, Plus, Check, Loader2, Trash2, Music, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useToast } from '../store/useToast';
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
  const toast = useToast();
  const [showPlaylists, setShowPlaylists] = useState(false);

  const videoId = isTrack(item) ? item.video_id : item.videoId;
  const dlStatus = downloads[videoId] || { status: 'idle' };
  const isCurrentTrack = player.currentTrack?.video_id === videoId;

  const pollStatus = (vid: string, onComplete?: (track: Track) => void) => {
    const interval = setInterval(async () => {
      try {
        const status = await getDownloadStatus(vid);
        if (status.status === 'complete' && status.track) {
          clearInterval(interval);
          setDownloadStatus(vid, status);
          addToLibrary(status.track);
          onComplete?.(status.track);
        } else if (status.status === 'downloading') {
          setDownloadStatus(vid, status);
        } else if (status.status === 'error') {
          clearInterval(interval);
          setDownloadStatus(vid, { status: 'error', message: (status as { error?: string }).error || 'Download failed' });
          toast.add('Download failed — check that yt-dlp and ffmpeg are installed', 'error');
        } else if ((status as { status: string }).status === 'not_started') {
          clearInterval(interval);
          setDownloadStatus(vid, { status: 'error', message: 'Download failed' });
          toast.add('Download failed — check the server console for details', 'error');
        }
      } catch {
        clearInterval(interval);
      }
    }, 800);
  };

  const startTrackDownload = (onComplete?: (track: Track) => void) => {
    if (isTrack(item)) return;
    setDownloadStatus(videoId, { status: 'downloading', progress: 0 });
    toast.add(`Downloading "${item.title}"…`, 'info');
    startDownload({
      videoId: item.videoId,
      title: item.title,
      artist: item.artist,
      duration: item.duration,
      thumbnail: item.thumbnail,
    }).then((result) => {
      if (result.status === 'exists' && result.track) {
        setDownloadStatus(videoId, { status: 'complete', track: result.track });
        addToLibrary(result.track);
        onComplete?.(result.track);
      } else {
        pollStatus(videoId, onComplete);
      }
    }).catch(() => {
      setDownloadStatus(videoId, { status: 'error', message: 'Failed to start download' });
      toast.add('Could not reach the server', 'error');
    });
  };

  const handlePlay = () => {
    if (isTrack(item)) {
      playTrack(item, queue || [item]);
      return;
    }
    if (dlStatus.status === 'complete' && dlStatus.track) {
      playTrack(dlStatus.track, queue);
      return;
    }
    if (dlStatus.status === 'downloading') {
      toast.add('Still downloading, hold on…', 'info');
      return;
    }
    startTrackDownload((track) => {
      toast.add(`Playing "${track.title}"`, 'success');
      playTrack(track);
    });
  };

  const handleSave = () => {
    if (isTrack(item) || dlStatus.status === 'complete' || dlStatus.status === 'downloading') return;
    startTrackDownload((track) => {
      toast.add(`"${track.title}" saved to library`, 'success');
    });
  };

  const handleDelete = async () => {
    if (!isTrack(item)) return;
    try {
      await deleteTrack(item.id);
      removeFromLibrary(item.id);
      toast.add('Removed from library', 'info');
    } catch {
      toast.add('Failed to delete track', 'error');
    }
  };

  const handleAddToPlaylist = async (plId: string) => {
    // For search results, the track must be downloaded first
    const trackId = isTrack(item)
      ? item.id
      : (dlStatus.status === 'complete' && (dlStatus as { track?: Track }).track?.id) || null;

    if (!trackId) {
      setShowPlaylists(false);
      toast.add('Save the song to your library first, then add it to a playlist', 'info');
      return;
    }

    try {
      await addTrackToPlaylist(plId, trackId);
      const updated = await getPlaylists();
      setPlaylists(updated);
      setShowPlaylists(false);
      const pl = playlists.find((p) => p.id === plId);
      toast.add(`Added to "${pl?.name || 'playlist'}"`, 'success');
    } catch {
      toast.add('Failed to add to playlist', 'error');
    }
  };

  const isSaved = isTrack(item) || dlStatus.status === 'complete';
  const isDownloading = dlStatus.status === 'downloading';
  const hasError = dlStatus.status === 'error';
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
          <img src={item.thumbnail} alt="" className="w-10 h-10 rounded object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
          ) : hasError ? (
            <AlertCircle size={16} className="text-red-400" />
          ) : (
            <Play size={16} className={`text-white fill-white ${isCurrentTrack ? 'text-groove-green fill-groove-green' : ''}`} />
          )}
        </button>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-groove-green' : hasError ? 'text-red-400' : 'text-white'}`}>
          {item.title}
        </p>
        <p className="text-xs text-groove-muted truncate">
          {hasError ? 'Download failed — click to retry' : item.artist}
        </p>
        {isDownloading && (
          <div className="mt-1 h-0.5 bg-groove-surface3 rounded-full overflow-hidden w-full">
            <div className="h-full bg-groove-green transition-all duration-300 rounded-full"
              style={{ width: `${progress || 5}%` }} />
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
          <button onClick={handleSave} title={isSaved ? 'Saved' : 'Save to library'}
            className={`p-1.5 rounded-full transition-colors ${isSaved ? 'text-groove-green' : 'text-groove-muted hover:text-white'}`}>
            {isDownloading ? <Loader2 size={14} className="animate-spin" />
              : isSaved ? <Check size={14} /> : <Download size={14} />}
          </button>
        )}

        {/* Add to playlist */}
        <div className="relative">
          <button onClick={() => setShowPlaylists(!showPlaylists)} title="Add to playlist"
            className="p-1.5 rounded-full text-groove-muted hover:text-white transition-colors">
            <Plus size={14} />
          </button>
          {showPlaylists && (
            <div className="absolute right-0 bottom-full mb-1 w-52 bg-groove-surface3 rounded-lg shadow-xl z-50 py-1 border border-white/10">
              {playlists.length === 0 ? (
                <p className="text-groove-muted text-xs px-3 py-2">No playlists — create one in the sidebar</p>
              ) : (
                playlists.map((pl) => (
                  <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id)}
                    className="w-full text-left px-3 py-2 text-sm text-groove-muted hover:text-white hover:bg-groove-surface2 transition-colors">
                    {pl.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {isLibrary && (
          <button onClick={handleDelete} title="Remove from library"
            className="p-1.5 rounded-full text-groove-muted hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        )}

        {playlistId && onRemoveFromPlaylist && isTrack(item) && (
          <button onClick={() => onRemoveFromPlaylist(item.id)} title="Remove from playlist"
            className="p-1.5 rounded-full text-groove-muted hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
