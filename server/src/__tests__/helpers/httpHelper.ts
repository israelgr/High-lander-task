import express, { Express, Request, Response, NextFunction } from 'express';

export function createTestApp(router: express.Router, basePath = '/api'): Express {
  const app = express();
  app.use(express.json());
  app.use(basePath, router);

  // Simple error handler for tests
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
  });

  return app;
}
