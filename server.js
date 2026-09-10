const path = require('path');
const express = require('express');
const { runTest } = require('./lib/runTest');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

app.post('/api/test', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Podaj poprawny adres URL.' });
  }

  try {
    const result = await runTest(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Nie udało się przeprowadzić kontroli.' });
  }
});

app.listen(PORT, () => {
  console.log(`CzernexReach TestPilot listening on http://localhost:${PORT}`);
});

module.exports = app;
