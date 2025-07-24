import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: 'An internal server error occurred.',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found`,
  });
};
