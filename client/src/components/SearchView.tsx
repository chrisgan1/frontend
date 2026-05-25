import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Music } from 'lucide-react';
import { useStore } from '../store/useStore';
import { searchYouTube } from '../api';
import TrackRow from './TrackRow';
import { Track } from '../types';

export default function SearchView() {
  const { searchResults, searchQuery, isSearching, setSearchResults, setSearchQuery, setIsSearching, downloads } = useStore();
  const [input, setInput] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const results = await searchYouTube(q);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const onInput = (val: string) => {
    setInput(val);
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(val), 600);
  };

  // Build queue from results that are already saved
  const savedTracks = searchResults
    .filter((r) => {
      const dl = downloads[r.videoId];
      return dl?.status === 'complete' && dl.track;
    })
    .map((r) => (downloads[r.videoId] as { status: 'complete'; track: Track }).track);

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-6 pt-6 pb-4">
        <div className="relative max-w-lg">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-groove-subtle pointer-events-none"
          />
          <input
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                clearTimeout(debounceRef.current);
                handleSearch(input);
              }
            }}
            placeholder="Search for songs, artists…"
            className="w-full bg-groove-surface2 text-white placeholder-groove-subtle pl-10 pr-4 py-3 rounded-full text-sm outline-none focus:ring-2 focus:ring-white/20 transition-all"
          />
          {isSearching && (
            <Loader2
              size={16}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-groove-muted animate-spin"
            />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-2">
        {!input.trim() && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-groove-subtle">
            <Music size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium text-groove-muted">Find your next favourite</p>
            <p className="text-sm mt-1">Search for any song or artist</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div>
            <p className="text-xs text-groove-subtle uppercase tracking-wider font-semibold px-4 mb-3">
              Results for "{searchQuery}"
            </p>
            {searchResults.map((result) => (
              <TrackRow
                key={result.videoId}
                item={result}
                queue={savedTracks}
              />
            ))}
          </div>
        )}

        {input.trim() && !isSearching && searchResults.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-groove-subtle">
            <p className="text-sm">No results for "{input}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
