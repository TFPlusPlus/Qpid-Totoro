const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from project root (index.html, styles.css, script.js)
app.use(express.static(path.join(__dirname)));

// Fallback to `index.html` for client-side routes (so /Fifi and /Totoro load the app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening: http://localhost:${port}`);
});
