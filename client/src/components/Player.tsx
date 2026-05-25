import { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Music,
  Shuffle, Repeat,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { audioUrl } from '../api';
import { formatDuration } from '../utils';

export default function Player() {
  const {
    player,
    setIsPlaying,
    setProgress,
    setDuration,
    setVolume,
    playNext,
    playPrev,
  } = useStore();

  const { currentTrack, isPlaying, progress, duration, volume } = player;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [seeking, setSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVol, setPrevVol] = useState(0.8);

  // Load new track
  useEffect(() => {
    if (!audioRef.current || !currentTrack) return;
    audioRef.current.src = audioUrl(currentTrack.filename);
    audioRef.current.load();
    if (isPlaying) audioRef.current.play().catch(() => {});
  }, [currentTrack?.video_id]);

  // Play/pause
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.play().catch(() => {});
    else audioRef.current.pause();
  }, [isPlaying]);

  // Volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  const onTimeUpdate = () => {
    if (!audioRef.current || seeking) return;
    setProgress(audioRef.current.currentTime);
  };

  const onLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const onEnded = () => {
    playNext();
  };

  const handleSeekStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeeking(true);
    setSeekValue(Number(e.target.value));
  };

  const handleSeekEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSeeking(false);
    setProgress(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(prevVol);
    } else {
      setPrevVol(volume);
      setIsMuted(true);
    }
  };

  const displayProgress = seeking ? seekValue : progress;
  const progressPct = duration > 0 ? (displayProgress / duration) * 100 : 0;

  if (!currentTrack) {
    return (
      <footer className="h-20 bg-groove-surface border-t border-white/5 flex items-center justify-center">
        <p className="text-groove-subtle text-sm">Search for a song and hit play</p>
      </footer>
    );
  }

  return (
    <footer className="h-20 bg-groove-surface border-t border-white/5 flex flex-col">
      {/* Progress bar */}
      <div className="px-4 pt-2">
        <div className="relative flex items-center gap-2">
          <span className="text-xs text-groove-muted w-10 text-right shrink-0">
            {formatDuration(displayProgress)}
          </span>
          <div className="flex-1 relative group">
            <div className="h-1 bg-groove-surface3 rounded-full">
              <div
                className="h-full bg-groove-green rounded-full pointer-events-none"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={displayProgress}
              onChange={handleSeekStart}
              onMouseUp={(e) => handleSeekEnd(e as unknown as React.ChangeEvent<HTMLInputElement>)}
              onTouchEnd={(e) => handleSeekEnd(e as unknown as React.ChangeEvent<HTMLInputElement>)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
            />
          </div>
          <span className="text-xs text-groove-muted w-10 shrink-0">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between px-4 flex-1">
        {/* Track info */}
        <div className="flex items-center gap-3 w-1/3 min-w-0">
          {currentTrack.thumbnail ? (
            <img
              src={currentTrack.thumbnail}
              alt=""
              className="w-10 h-10 rounded object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-groove-surface2 flex items-center justify-center shrink-0">
              <Music size={14} className="text-groove-subtle" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentTrack.title}</p>
            <p className="text-xs text-groove-muted truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={playPrev}
            className="text-groove-muted hover:text-white transition-colors"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause size={18} className="text-black fill-black" />
            ) : (
              <Play size={18} className="text-black fill-black ml-0.5" />
            )}
          </button>
          <button
            onClick={playNext}
            className="text-groove-muted hover:text-white transition-colors"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2 w-1/3 justify-end">
          <button onClick={toggleMute} className="text-groove-muted hover:text-white transition-colors">
            {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <div className="relative w-24 group">
            <div className="h-1 bg-groove-surface3 rounded-full">
              <div
                className="h-full bg-groove-green rounded-full pointer-events-none"
                style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setIsMuted(false);
                setVolume(Number(e.target.value));
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-1"
            />
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="auto"
      />
    </footer>
  );
}
