const app = require('./app');
const { PORT } = require('./config/env');
const { migrate } = require('./db/migrate');
const { seed } = require('./db/seeds');

migrate();
seed();

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});