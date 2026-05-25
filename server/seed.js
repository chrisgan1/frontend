const Database = require('better-sqlite3');
const path = require('path');
const { execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = '/home/user/frontend/server/groove.db';
const DL_DIR = '/home/user/frontend/server/downloads';

const db = new Database(DB_PATH);

const tracks = [
  { videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', duration: 354 },
  { videoId: 'YkgkThdzX-8', title: 'Stairway to Heaven', artist: 'Led Zeppelin', duration: 482 },
  { videoId: 'hTWKbfoikeg', title: 'Smells Like Teen Spirit', artist: 'Nirvana', duration: 301 },
  { videoId: '1w7OgIMMRc4', title: 'Sweet Child O Mine', artist: "Guns N' Roses", duration: 356 },
  { videoId: 'rY0WxgSXdEE', title: 'Lose Yourself', artist: 'Eminem', duration: 326 },
  { videoId: 'ktvTqknDobU', title: 'Radioactive', artist: 'Imagine Dragons', duration: 187 },
  { videoId: '09R8_2nJtjg', title: 'Shape of You', artist: 'Ed Sheeran', duration: 234 },
  { videoId: 'JGwWNGJdvx8', title: 'Stay With Me', artist: 'Sam Smith', duration: 172 },
];

for (const t of tracks) {
  const filename = `${t.videoId}.mp3`;
  const filePath = `${DL_DIR}/${filename}`;
  // Generate a 3-second silent MP3 as a stand-in
  execSync(`ffmpeg -y -f lavfi -i "sine=frequency=440:duration=3" -q:a 9 -acodec libmp3lame "${filePath}" 2>/dev/null`);
  const id = uuidv4();
  db.prepare(`INSERT OR IGNORE INTO tracks (id, video_id, title, artist, duration, thumbnail, filename, added_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, t.videoId, t.title, t.artist, t.duration,
    `https://i.ytimg.com/vi/${t.videoId}/mqdefault.jpg`,
    filename, Date.now());
  console.log('Added:', t.title);
}

// Add a demo playlist
const plId = uuidv4();
db.prepare(`INSERT OR IGNORE INTO playlists (id, name, created_at) VALUES (?, ?, ?)`).run(plId, 'Rock Classics', Date.now());
const tracks_in_db = db.prepare('SELECT id FROM tracks LIMIT 4').all();
tracks_in_db.forEach((t, i) => {
  db.prepare(`INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)`).run(plId, t.id, i);
});
console.log('Created playlist: Rock Classics');
