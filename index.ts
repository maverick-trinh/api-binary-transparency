import app from './src/app';
import logger from './src/config/logger';
import { PORT, NODE_ENV } from './src/config/environment';

const startServer = async(): Promise<void> => {
  try {
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);

      process.on('unhandledRejection', (err: Error) => {
        logger.error('Unhandled Rejection! Shutting down...', err);
        server.close(() => {
          process.exit(1);
        });
      });

      process.on('uncaughtException', (err: Error) => {
        logger.error('Uncaught Exception! Shutting down...', err);
        process.exit(1);
      });
    });
  } catch (error) {
    logger.error('Failed to start server: ', error);
    process.exit(1);
  }
}

startServer();