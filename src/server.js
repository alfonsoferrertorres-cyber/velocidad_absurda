const express = require('express');
const path = require('path');
const compression = require('compression');
const zlib = require('node:zlib');
const fs = require('fs');
const multer = require('multer');

// App preferences
const APP_VERSION = '1.3.0';
const APP_NAME = 'VelocidadAbsurdaWeb';
const APP_PORT = process.env.PORT || 1337;

console.log(`${(new Date()).toISOString()} | ${APP_NAME} v${APP_VERSION} | Starting web server`);
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(compression({
  level: zlib.constants.Z_BEST_COMPRESSION,
}));

app.use('/assets', express.static(path.join(__dirname, '../assets'), {
  maxAge: '864000000' // 10 días de caché
}));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const eventsDir = path.join(__dirname, '../assets/img/events');
    if (!fs.existsSync(eventsDir)) fs.mkdirSync(eventsDir, { recursive: true });
    cb(null, eventsDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'latest.jpg');
  }
});
const upload = multer({ storage: storage });

// API ENDPOINT: Evalúa fecha del concierto para responder como FUTURO o PASADO
app.get('/api/latest-post', (req, res) => {
  const metadataPath = path.join(__dirname, '../assets/img/events/latest.json');
  const dynamicPosterPath = path.join(__dirname, '../assets/img/events/latest.jpg');

  let metadata = {
    title: 'FIESTORRO CIERRE DE TEMPORADA',
    lineup: 'SPIDIKFLOTES + PUTO DONAL + VELOCIDAD ABSURDA + KONTRAGOLPES',
    date: '2026-06-27', // Formato YYYY-MM-DD
    dateText: 'Sábado, 27 de Junio de 2026',
    venue: 'Sala Marearock (Babel Live Music)',
    city: 'Alicante',
    ticketUrl: 'https://sonidoabsurdo.es'
  };

  if (fs.existsSync(metadataPath)) {
    try {
      const savedData = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      metadata = { ...metadata, ...savedData };
    } catch (e) {
      console.error('Error leyendo metadata:', e.message);
    }
  }

  const imageUrl = fs.existsSync(dynamicPosterPath)
    ? `/assets/img/events/latest.jpg?v=${Date.now()}`
    : '/assets/img/27.2.24 080.jpg';

  // Evaluación de estado de fecha
  const eventDate = new Date(metadata.date);
  const now = new Date();
  const isUpcoming = eventDate >= now;

  res.json({
    success: true,
    isUpcoming,
    imageUrl,
    metadata
  });
});

// ADMIN PANEL
app.get('/admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Panel de Conciertos | Velocidad Absurda</title>
      <style>
        body { background:#0d0d11; color:#00ff66; font-family:monospace; padding:2rem 1rem; margin:0; text-align:center; }
        .box { border:1px solid #00ff66; max-width:500px; margin:0 auto; padding:1.5rem; background:#000; }
        h1 { color:#ff5500; margin-top:0; }
        label { display:block; text-align:left; margin-top:1rem; color:#fff; }
        input { width:100%; padding:0.8rem; margin-top:0.3rem; background:#111; border:1px solid #00ff66; color:#00ff66; font-family:monospace; box-sizing:border-box; }
        button { margin-top:1.5rem; width:100%; padding:1rem; background:#ff5500; color:#000; font-weight:bold; border:none; cursor:pointer; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>[GESTIÓN DE ASALTOS]</h1>
        <form action="/admin/upload" method="POST" enctype="multipart/form-data">
          <label>Título del Evento:</label>
          <input type="text" name="title" required placeholder="Ej: ASALTO EN SALA MAREAROCK">
          <label>Fecha (YYYY-MM-DD):</label>
          <input type="date" name="date" required>
          <label>Lugar / Sala y Ciudad:</label>
          <input type="text" name="venue" required placeholder="Ej: Sala Marearock - Alicante">
          <label>Imagen del Cartel (JPG/PNG):</label>
          <input type="file" name="poster" accept="image/*" required>
          <button type="submit">PUBLICAR EN LA WEB</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/admin/upload', upload.single('poster'), (req, res) => {
  const metadataPath = path.join(__dirname, '../assets/img/events/latest.json');
  const metadata = {
    title: req.body.title || 'PRÓXIMO ASALTO EN DIRECTO',
    date: req.body.date || new Date().toISOString().split('T')[0],
    venue: req.body.venue || 'Alicante',
    updatedAt: new Date()
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  res.send('<body style="background:#0d0d11;color:#00ff66;font-family:monospace;text-align:center;padding:3rem;"><h2>¡CONCIERTO PUBLICADO!</h2><a href="/" style="color:#ff5500;">VOLVER A LA HOME</a></body>');
});

// WEBHOOK DE REDES
app.post(['/api/webhook/instagram', '/api/webhook/meta'], (req, res) => {
  const metadataPath = path.join(__dirname, '../assets/img/events/latest.json');
  const metadata = {
    title: req.body.caption || 'PRÓXIMO ASALTO EN DIRECTO',
    date: req.body.date || new Date().toISOString().split('T')[0],
    updatedAt: new Date()
  };
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  res.json({ success: true, message: 'Cartel indexado correctamente' });
});

// RUTAS PRINCIPALES
app.get(['/', '/index', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '../assets/html/index.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../assets/html/index.html'));
});

app.listen(APP_PORT, () => {
  console.log(`${(new Date()).toISOString()} | Server running on port ${APP_PORT}`);
});