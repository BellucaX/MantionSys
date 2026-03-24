const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes/api.routes');
const { getRootHealth } = require('./controllers/health.controller');
const { requestLogger } = require('./middlewares/request-logger.middleware');
const { notFoundHandler } = require('./middlewares/not-found.middleware');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get('/', getRootHealth);
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;