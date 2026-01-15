import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Security headers
app.use(helmet());

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Limit request body size to prevent DoS
app.use(express.json({ limit: '100kb' }));

// Rate limit auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
