const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, DOWNLOADS_DIR } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const tracks = db.prepare('SELECT * FROM tracks ORDER BY added_at DESC').all();
  res.json(tracks);
});

router.delete('/:id', (req, res) => {
  const track = db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Not found' });

  const filePath = path.join(DOWNLOADS_DIR, track.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM tracks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.get('/audio/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(DOWNLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

module.exports = router;
