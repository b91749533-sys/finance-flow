import * as dotenv from 'dotenv';
import * as http from 'http';
import app from './app';
import { initSocket } from './services/socket';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io WebSockets
initSocket(server);

// Start server listening
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Personal Finance Platform Server is running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🚀 Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});
