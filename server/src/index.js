const express = require('express');
const cors = require('cors');
const path = require('path');

const searchRouter = require('./routes/search');
const downloadRouter = require('./routes/download');
const libraryRouter = require('./routes/library');
const playlistsRouter = require('./routes/playlists');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/search', searchRouter);
app.use('/api/download', downloadRouter);
app.use('/api/library', libraryRouter);
app.use('/api/playlists', playlistsRouter);

// Serve built client in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  const index = path.join(clientDist, 'index.html');
  res.sendFile(index, (err) => {
    if (err) res.status(404).send('Client not built yet');
  });
});

app.listen(PORT, () => {
  console.log(`Groove server running on http://localhost:${PORT}`);
});
