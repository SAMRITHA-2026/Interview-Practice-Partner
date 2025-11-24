require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const sessionRoutes = require('./routes/session'); // MUST export router

const app = express();
const PORT = process.env.PORT || 4000;

// ----------------------
// GLOBAL MIDDLEWARE
// ----------------------
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// ----------------------
// ROUTES
// ----------------------
app.use('/api/session', sessionRoutes);

app.get('/', (req, res) => {
  res.send('Interview Agent Backend');
});

// ----------------------
// SERVER LISTEN
// ----------------------
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
