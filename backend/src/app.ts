import express from 'express';
import path from 'path';
import apiRoutes from './routes';

const app = express();
const dashboardPublicDir = path.join(__dirname, '../public');

app.use(apiRoutes);

app.use(express.static(dashboardPublicDir));

app.use((_req, res) => {
  res.sendFile(path.join(dashboardPublicDir, 'index.html'));
});

app.listen(3003);
