import { Request, Response, NextFunction } from 'express';
import { HttpStatusCodes } from '../enums';
import { sendErrorResponse } from '../utils/helpers';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(error);
  }

  return sendErrorResponse(
    res,
    'Internal server error',
    HttpStatusCodes.INTERNAL_SERVER_ERROR,
    process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
    'INTERNAL_ERROR'
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  return sendErrorResponse(
    res,
    'Route not found',
    HttpStatusCodes.NOT_FOUND,
    `The requested route ${req.originalUrl} was not found on this server`,
    'ROUTE_NOT_FOUND'
  );
};
