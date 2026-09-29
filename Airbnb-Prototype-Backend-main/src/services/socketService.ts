import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { corsOrigins } from "../config/env";
import { AppDataSource } from "../config/database";
import { WhatsAppMessage } from "../entities/WhatsAppMessage";
import { Booking } from "../entities/Booking";
import { memoryStore } from "./memoryStore";

let io: SocketIOServer | null = null;

export interface WhatsAppStatusPayload {
  status: "disconnected" | "connecting" | "qr_ready" | "connected" | "error";
  qrCode: string | null;
  userPhone?: string | null;
  error?: string | null;
}

// Current in-memory status cache for instant client sync
let currentStatus: WhatsAppStatusPayload = {
  status: "disconnected",
  qrCode: null,
  userPhone: null,
  error: null,
};

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow all configured origins or local dev
        if (!origin || corsOrigins.includes(origin) || origin.includes("localhost")) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", async (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Send immediately cached connection status and QR code
    socket.emit("whatsapp_status", currentStatus);

    // Send recent bookings
    try {
      if (AppDataSource.isInitialized) {
        const bookingRepo = AppDataSource.getRepository(Booking);
        const recentBookings = await bookingRepo.find({
          relations: ["property", "guest"],
          order: { createdAt: "DESC" },
          take: 20,
        });
        socket.emit("bookings_history", recentBookings);

        const msgRepo = AppDataSource.getRepository(WhatsAppMessage);
        const recentMessages = await msgRepo.find({
          order: { createdAt: "DESC" },
          take: 50,
        });
        socket.emit("whatsapp_messages_history", recentMessages.reverse());
      } else {
        socket.emit("bookings_history", memoryStore.getBookings());
        socket.emit("whatsapp_messages_history", memoryStore.getMessages());
      }
    } catch (err) {
      console.error("[Socket.IO] Error fetching initial data for client:", err);
    }

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function broadcastWhatsAppStatus(statusPayload: WhatsAppStatusPayload) {
  currentStatus = { ...statusPayload };
  if (io) {
    io.emit("whatsapp_status", currentStatus);
  }
}

export function getCurrentWhatsAppStatus(): WhatsAppStatusPayload {
  return currentStatus;
}

export function broadcastNewBooking(booking: any) {
  memoryStore.addBooking(booking);
  if (io) {
    io.emit("new_booking", booking);
  }
}

export function broadcastWhatsAppMessage(message: any) {
  memoryStore.addMessage(message);
  if (io) {
    io.emit("whatsapp_message_received", message);
  }
}

export function broadcastWhatsAppMessageSent(message: any) {
  memoryStore.addMessage(message);
  if (io) {
    io.emit("whatsapp_message_sent", message);
  }
}

export function broadcastAdminNotification(notification: any) {
  if (io) {
    io.emit("admin_notification", notification);
  }
}

