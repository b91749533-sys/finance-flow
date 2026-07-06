import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

let io: Server;
const userSockets = new Map<string, string[]>(); // userId -> socketIds

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Auth verification on connection
    const token = socket.handshake.auth.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '9a2f1c8d3e6b4f7a5c8e9d0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c') as { id: string };
        const userId = decoded.id;
        
        socket.data.userId = userId;
        
        const existing = userSockets.get(userId) || [];
        existing.push(socket.id);
        userSockets.set(userId, existing);
        
        console.log(`Socket ${socket.id} mapped to user ${userId}`);
      } catch (err: any) {
        console.error('Socket authentication failed:', err.message);
      }
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const userId = socket.data.userId;
      if (userId) {
        const existing = userSockets.get(userId) || [];
        const filtered = existing.filter((id) => id !== socket.id);
        if (filtered.length > 0) {
          userSockets.set(userId, filtered);
        } else {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized!');
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  try {
    const socketIds = userSockets.get(userId);
    if (socketIds && socketIds.length > 0) {
      const ioInstance = getIO();
      socketIds.forEach((socketId) => {
        ioInstance.to(socketId).emit(event, data);
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error emitting to user via socket:', err);
    return false;
  }
};
