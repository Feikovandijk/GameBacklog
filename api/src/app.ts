import express, { Request, Response } from 'express';
import session from 'express-session';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { passport } from './auth/steam-auth';
import config from './config';
import { doubleCsrfProtection, generateCsrfToken } from './middleware/csrf';

// Routes
import authRoutes from './routes/auth.routes';
import gamesRoutes from './routes/games.routes';
import userRoutes from './routes/user.routes';
import * as statsController from './controllers/stats.controller';

const app = express();

app.set('trust proxy', 1);

// CORS Configuration
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Session configuration
// secure: 'auto' — always issues the cookie but only marks it Secure when the
// connection is HTTPS (determined via trust-proxy / X-Forwarded-Proto).
// With secure: true + proxy: false the cookie is silently dropped on the
// HTTP leg between nginx and Express, so the browser never receives it.
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    // proxy: undefined → defers to app-level `trust proxy` (set to 1 above)
    cookie: {
      secure: 'auto',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || undefined,
    },
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection middleware (must run after session & auth)
app.use(doubleCsrfProtection);

// Health routes (keep both for compatibility with infra probes)
const getHealthPayload = () => ({
  status: 'ok',
  service: process.env.SERVICE_NAME || 'api',
  timestamp: new Date().toISOString(),
  version: process.env.npm_package_version || 'unknown',
  commit: process.env.GIT_SHA || 'unknown',
});

app.get('/health', (_req: Request, res: Response) => {
  res.json(getHealthPayload());
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json(getHealthPayload());
});

// CSRF Token Endpoint
app.get('/api/csrf-token', (req: Request, res: Response) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// Stats & Analytics (Simple enough to keep separate or basic controller)
app.get('/api/stats', statsController.getStats);
app.get('/api/analytics', statsController.getAnalytics);

// Mount Router Modules
app.use('/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/user', userRoutes); // User routes include /games sub-route

export default app;
