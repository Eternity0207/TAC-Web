import express from 'express';
import path from 'path';
import cors from 'cors';
import apiRoutes from './routes';
import { config } from './config';

const app = express();
const dashboardPublicDir = path.join(__dirname, '../public');
const dashboardIndexFile = path.join(dashboardPublicDir, 'index.html');

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value.trim().replace(/\/+$/, '');
  }
}

const allowedOrigins = new Set(
  [
    ...config.corsOrigins,
    config.frontendUrl,
    config.adminUrl,
    config.backendUrl,
  ]
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean),
);

const firstPartyOriginPattern = /^https:\/\/([a-z0-9-]+\.)?theawlacompany\.com$/i;

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server calls and curl requests without Origin.
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.has(normalizedOrigin) || firstPartyOriginPattern.test(normalizedOrigin)) {
      return callback(null, true);
    }

    // Deny CORS without throwing 500 for asset and API requests.
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors(corsOptions));
app.options('/{*corsPath}', cors(corsOptions));

app.use('/api', apiRoutes);
app.use('/api', (_req, res) => {
  return res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

app.use(express.static(dashboardPublicDir));

app.get('/{*spaPath}', (_req, res) => {
  return res.sendFile(dashboardIndexFile);
});

app.listen(3003);
