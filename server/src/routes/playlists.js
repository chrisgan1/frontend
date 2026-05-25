const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const playlists = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all();
  const result = playlists.map((pl) => {
    const tracks = db
      .prepare(
        `SELECT t.* FROM tracks t
         JOIN playlist_tracks pt ON pt.track_id = t.id
         WHERE pt.playlist_id = ?
         ORDER BY pt.position ASC`
      )
      .all(pl.id);
    return { ...pl, tracks };
  });
  res.json(result);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  db.prepare('INSERT INTO playlists (id, name, created_at) VALUES (?, ?, ?)').run(
    id, name.trim(), Date.now()
  );
  res.json({ id, name: name.trim(), created_at: Date.now(), tracks: [] });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  db.prepare('UPDATE playlists SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json({ success: true });
});

router.post('/:id/tracks', (req, res) => {
  const { trackId } = req.body;
  if (!trackId) return res.status(400).json({ error: 'trackId required' });

  const existing = db
    .prepare('SELECT * FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?')
    .get(req.params.id, trackId);
  if (existing) return res.json({ success: true, message: 'Already in playlist' });

  const maxPos = db
    .prepare('SELECT MAX(position) as m FROM playlist_tracks WHERE playlist_id = ?')
    .get(req.params.id);
  const position = (maxPos?.m ?? -1) + 1;

  db.prepare(
    'INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)'
  ).run(req.params.id, trackId, position);

  res.json({ success: true });
});

router.delete('/:id/tracks/:trackId', (req, res) => {
  db.prepare(
    'DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?'
  ).run(req.params.id, req.params.trackId);
  res.json({ success: true });
});

module.exports = router;
