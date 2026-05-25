# Groove

A Spotify-like music player that searches YouTube, converts videos to MP3, and saves them locally.

## Requirements

- Node.js 18+
- Python 3 + yt-dlp (`pip install yt-dlp`)
- ffmpeg (`apt install ffmpeg` / `brew install ffmpeg`)

## Setup

```bash
# Install all dependencies
npm run install:all

# Start both server and client in dev mode
npm run dev
```

The app runs at **http://localhost:5173** (client) proxied to **http://localhost:3001** (server).

## Usage

1. **Search** — type any song or artist name
2. **Play** — click the play button on a result; the track downloads and plays automatically
3. **Save** — click the download icon to save to your library without playing
4. **Library** — all saved MP3s live under `server/downloads/`
5. **Playlists** — create playlists from the sidebar, then add tracks via the + button on any row
