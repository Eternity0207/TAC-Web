import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import apiRoutes from './routes';
import { config } from './config';
import { extractTokenFromRequest } from './middleware/auth';

const app = express();
const dashboardPublicDir = path.join(__dirname, '../public');
const dashboardIndexFile = path.join(dashboardPublicDir, 'index.html');
const allowedOrigins = new Set(config.corsOrigins);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server calls and curl requests without Origin.
    if (!origin) return callback(null, true);

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

function hasValidAuthToken(req: express.Request): boolean {
  const token = extractTokenFromRequest(req);
  if (!token) return false;

  try {
    jwt.verify(token, config.jwtSecret);
    return true;
  } catch {
    return false;
  }
}

function looksLikeLegacyApiRequest(req: express.Request): boolean {
  if (req.path.startsWith('/api')) return false;

  const uiPaths = ['/', '/login', '/admin', '/dashboard'];
  if (uiPaths.some((route) => req.path === route || req.path.startsWith(`${route}/`))) {
    return false;
  }

  if (req.path.startsWith('/assets/') || req.path === '/favicon.ico' || req.path === '/logo.png') {
    return false;
  }

  const hasAuthHeader = Boolean(req.headers.authorization);
  const acceptsJson = String(req.headers.accept || '').includes('application/json');
  const hasJsonContentType = String(req.headers['content-type'] || '').includes('application/json');

  return req.method !== 'GET' || hasAuthHeader || acceptsJson || hasJsonContentType;
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Backward compatibility: legacy API requests are internally rewritten to /api/*.
app.use((req, _res, next) => {
  if (looksLikeLegacyApiRequest(req)) {
    req.url = `/api${req.url}`;
  }
  next();
});

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  if (hasValidAuthToken(req)) {
    return res.redirect('/admin');
  }
  return res.redirect('/login');
});

app.get('/login', (_req, res) => {
  res.sendFile(dashboardIndexFile);
});

app.get(/^\/(admin|dashboard)(\/.*)?$/, (req, res) => {
  if (!hasValidAuthToken(req)) {
    return res.redirect('/login');
  }

  res.sendFile(dashboardIndexFile);
});

app.use(express.static(dashboardPublicDir));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: 'API route not found',
      path: req.path,
    });
  }

  return res.redirect('/login');
});

app.listen(3003);
