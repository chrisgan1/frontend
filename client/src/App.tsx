import { useEffect } from 'react';
import { useStore } from './store/useStore';
import { getLibrary, getPlaylists } from './api';
import Sidebar from './components/Sidebar';
import SearchView from './components/SearchView';
import LibraryView from './components/LibraryView';
import PlaylistView from './components/PlaylistView';
import Player from './components/Player';

export default function App() {
  const { view, setLibrary, setPlaylists } = useStore();

  useEffect(() => {
    getLibrary().then(setLibrary).catch(() => {});
    getPlaylists().then(setPlaylists).catch(() => {});
  }, []);

  const renderMain = () => {
    if (view === 'search') return <SearchView />;
    if (view === 'library') return <LibraryView />;
    if (typeof view === 'object' && view.type === 'playlist') return <PlaylistView playlistId={view.id} />;
    return null;
  };

  return (
    <div className="h-screen bg-groove-bg flex flex-col overflow-hidden text-groove-text">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 bg-gradient-to-b from-groove-surface to-groove-bg overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {renderMain()}
          </div>
        </main>
      </div>
      <Player />
    </div>
  );
}
