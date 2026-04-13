import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import routes from './routes';

const app = express();

// App runs behind nginx reverse proxy in production.
app.set('trust proxy', 1);

// =============================================
// Security Middleware
// =============================================
app.use(helmet({
  contentSecurityPolicy: false, // Disable for admin panel
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// =============================================
// CORS Configuration
// =============================================
const corsOptions = {
  origin: function (origin: any, callback: any) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost origins for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Check against configured origins
    if (config.corsOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // For development, be more permissive
    if (config.nodeEnv === 'development') {
      console.log(`CORS allowing origin for development: ${origin}`);
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};
app.use(cors(corsOptions));

// =============================================
// Body Parsers
// =============================================
app.use(express.json({ limit: '50mb' })); // Large limit for base64 uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Debug incoming URLs from reverse proxy.
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[APP] ${req.method} originalUrl=${req.originalUrl} url=${req.url}`);
  next();
});

// =============================================
// Logging
// =============================================
if (config.nodeEnv !== 'production') {
  app.use(morgan('dev'));
}

// Development request logging
if (config.nodeEnv === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

console.log('📄 Using PostgreSQL as data source');

// =============================================
// Static Files
// =============================================
// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// =============================================
// API Routes
// =============================================
app.use('/api', routes);

// =============================================
// Backend Dashboard UI under /api
// =============================================
const dashboardPublicDir = path.join(__dirname, '../public');

// Serve static files (CSS, JS, images, etc.)
app.use('/api', express.static(dashboardPublicDir));

// SPA fallback: serve index.html for any unmatched /api routes
// Middleware (not a route) avoids path-to-regexp parsing issues
app.use('/api', (_req: Request, res: Response) => {
  res.sendFile(path.join(dashboardPublicDir, 'index.html'));
});

// =============================================
// Global Error Handling
// =============================================
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error:', err.stack);

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  return res.status(500).json({
    success: false,
    message: config.nodeEnv === 'production' ? 'Internal server error' : err.message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack })
  });
});

export default app;
