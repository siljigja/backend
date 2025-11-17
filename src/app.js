const express = require('express');
const helmet = require('helmet');
const path = require('node:path');
const { initStorage } = require('./config/storage');
const { errorHandler } = require('./middlewares/errorHandler');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const scanRoutes = require('./routes/scanRoutes');
const reportRoutes = require('./routes/reportRoutes');

initStorage();

const app = express();

app.use(helmet());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', scanRoutes);
app.use('/api', reportRoutes);

app.use('/storage/reports', express.static(path.resolve(process.cwd(), 'storage', 'reports')));

app.use((_req, res, _next) => res.status(404).json({ message: '요청한 리소스를 찾을 수 없습니다.' }));

app.use(errorHandler);

module.exports = app;

