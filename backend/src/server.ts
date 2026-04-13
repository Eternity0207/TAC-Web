import app from './app';
import { config } from './config';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Close server & exit process
  process.exit(1);
});

const server = app.listen(config.port, () => {
  const apiBase = `${config.backendUrl}/api`;
  console.log('================================================');
  console.log('🚀 Unified Order Management System');
  console.log('================================================');
  console.log(`Server: ${config.backendUrl}`);
  console.log(`Health: ${apiBase}/health`);
  console.log(`Admin Panel: ${config.adminUrl}`);
  console.log(`API Base: ${apiBase}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Data Source: PostgreSQL`);
  console.log('================================================');
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close((err) => {
    console.log('HTTP server closed');

    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }

    console.log('Graceful shutdown completed');
    process.exit(0);
  });

  // Force close after 30s
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default server;
