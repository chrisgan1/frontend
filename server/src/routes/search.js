const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.status(400).json({ error: 'Query required' });

  const results = [];
  let buffer = '';
  let responded = false;

  const ytdlp = spawn('yt-dlp', [
    `ytsearch15:${q}`,
    '--print-json',
    '--skip-download',
    '--no-playlist',
    '--no-warnings',
  ]);

  ytdlp.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const info = JSON.parse(line);
        const thumb =
          info.thumbnail ||
          (Array.isArray(info.thumbnails) && info.thumbnails.length
            ? info.thumbnails[info.thumbnails.length - 1].url
            : null);
        results.push({
          videoId: info.id,
          title: info.title,
          artist: info.uploader || info.channel || 'Unknown',
          duration: info.duration || 0,
          thumbnail: thumb || '',
        });
      } catch (_) {}
    }
  });

  ytdlp.on('close', () => {
    if (!responded) {
      responded = true;
      res.json(results);
    }
  });

  ytdlp.on('error', (err) => {
    if (!responded) {
      responded = true;
      res.status(500).json({ error: err.message });
    }
  });

  req.on('close', () => {
    if (!responded) ytdlp.kill();
  });
});

module.exports = router;
