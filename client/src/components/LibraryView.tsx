import { Library, Music } from 'lucide-react';
import { useStore } from '../store/useStore';
import TrackRow from './TrackRow';

export default function LibraryView() {
  const { library } = useStore();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Library size={28} className="text-groove-green" />
          <h1 className="text-2xl font-bold text-white">Your Library</h1>
        </div>
        <p className="text-groove-muted text-sm mt-1">
          {library.length} {library.length === 1 ? 'song' : 'songs'} saved locally
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {library.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-groove-subtle">
            <Music size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-medium text-groove-muted">Nothing here yet</p>
            <p className="text-sm mt-1">Search for songs and save them to your library</p>
          </div>
        ) : (
          <div>
            {library.map((track) => (
              <TrackRow
                key={track.id}
                item={track}
                isLibrary
                queue={library}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
