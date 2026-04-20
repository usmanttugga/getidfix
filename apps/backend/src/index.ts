import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { pingRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';

// ─── Routers ──────────────────────────────────────────────────────────────────
import authRouter          from './routes/auth.router';
import walletRouter        from './routes/wallet.router';
import requestsRouter      from './routes/requests.router';
import servicesRouter      from './routes/services.router';
import notificationsRouter from './routes/notifications.router';
import ninRouter           from './routes/nin.router';
import airtimeRouter       from './routes/airtime.router';
import dataRouter          from './routes/data.router';
import adminRouter         from './routes/admin.router';
import settingsRouter      from './routes/settings.router';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 20,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// ─── Body Parsing & Compression ───────────────────────────────────────────────
app.use(compression());
// Raw body for Paystack webhook signature verification
app.use('/api/v1/wallet/webhook', express.raw({ type: 'application/json' }));
// Raw body for Flutterwave webhook
app.use('/api/v1/wallet/flw-webhook', express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── Request Logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (_req: Request, res: Response) => {
  const redisOk = await pingRedis();
  res.status(redisOk ? 200 : 503).json({
    status: redisOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: { redis: redisOk ? 'ok' : 'unavailable' },
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth',          authLimiter, authRouter);
app.use('/api/v1/wallet',        walletRouter);
app.use('/api/v1/requests',      requestsRouter);
app.use('/api/v1/services',      servicesRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/nin',           ninRouter);
app.use('/api/v1/airtime',       airtimeRouter);
app.use('/api/v1/data',          dataRouter);
app.use('/api/v1/admin',         adminRouter);
app.use('/api/v1/settings',      settingsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ status: 'error', code: 'NOT_FOUND', message: 'The requested resource was not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[GETIDFIX API] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

export default app;
