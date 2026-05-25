const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db, DOWNLOADS_DIR } = require('../db');

const router = express.Router();

// videoId -> { status, progress, error }
const activeDownloads = new Map();

router.post('/', (req, res) => {
  const { videoId, title, artist, duration, thumbnail } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId required' });

  const existing = db.prepare('SELECT * FROM tracks WHERE video_id = ?').get(videoId);
  if (existing) return res.json({ status: 'exists', track: existing });

  if (activeDownloads.has(videoId)) {
    return res.json({ status: 'downloading', progress: activeDownloads.get(videoId).progress });
  }

  const trackId = uuidv4();
  const filename = `${videoId}.mp3`;
  const outputTemplate = path.join(DOWNLOADS_DIR, `${videoId}.%(ext)s`);

  activeDownloads.set(videoId, { status: 'downloading', progress: 0 });

  const ytdlp = spawn('yt-dlp', [
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', outputTemplate,
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);

  ytdlp.stdout.on('data', (data) => {
    const str = data.toString();
    const match = str.match(/(\d+\.?\d*)%/);
    if (match) {
      const current = activeDownloads.get(videoId);
      if (current) activeDownloads.set(videoId, { ...current, progress: parseFloat(match[1]) });
    }
  });

  ytdlp.stderr.on('data', (data) => {
    const str = data.toString();
    const match = str.match(/(\d+\.?\d*)%/);
    if (match) {
      const current = activeDownloads.get(videoId);
      if (current) activeDownloads.set(videoId, { ...current, progress: parseFloat(match[1]) });
    }
  });

  ytdlp.on('close', (code) => {
    activeDownloads.delete(videoId);
    if (code === 0) {
      try {
        db.prepare(
          `INSERT OR IGNORE INTO tracks (id, video_id, title, artist, duration, thumbnail, filename, added_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          trackId,
          videoId,
          title || 'Unknown Title',
          artist || 'Unknown Artist',
          duration || 0,
          thumbnail || '',
          filename,
          Date.now()
        );
      } catch (e) {
        console.error('DB insert error:', e.message);
      }
    }
  });

  res.json({ status: 'started', trackId });
});

router.get('/status/:videoId', (req, res) => {
  const { videoId } = req.params;

  const track = db.prepare('SELECT * FROM tracks WHERE video_id = ?').get(videoId);
  if (track) return res.json({ status: 'complete', track });

  const dl = activeDownloads.get(videoId);
  if (dl) return res.json({ status: 'downloading', progress: dl.progress });

  res.json({ status: 'not_started' });
});

module.exports = router;
