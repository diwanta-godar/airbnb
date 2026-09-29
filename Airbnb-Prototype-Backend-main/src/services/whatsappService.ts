import QRCode from "qrcode";
import pino from "pino";
import { clearTimeout, setTimeout } from "node:timers";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import makeWASocket, {
  DisconnectReason,
  BufferJSON,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
  type SignalKeyStore,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { In } from "typeorm";
import { env } from "../config/env";
import { AppDataSource } from "../config/database";
import { WhatsAppMessage } from "../entities/WhatsAppMessage";
import { WhatsAppAuthState } from "../entities/WhatsAppAuthState";
import {
  broadcastWhatsAppStatus,
  broadcastWhatsAppMessage,
  broadcastWhatsAppMessageSent,
  WhatsAppStatusPayload,
} from "./socketService";

type PendingAlert = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bookingItem: string;
  bookingDate: string;
  bookingTime?: string | null;
  customerNotes?: string | null;
  timestamp?: string;
};

const authEncryptionKey = createHash("sha256")
  .update(env.WHATSAPP_AUTH_ENCRYPTION_KEY)
  .digest();

function serializeAuthValue(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", authEncryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value, BufferJSON.replacer), "utf8"),
    cipher.final(),
  ]);
  return `v1.${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${encrypted.toString("base64")}`;
}

function deserializeAuthValue<T>(value: unknown): T {
  if (typeof value !== "string") {
    throw new Error("Stored WhatsApp auth state is invalid");
  }

  const [version, encodedIv, encodedTag, encodedData] = value.split(".");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedData) {
    throw new Error("Stored WhatsApp auth state has an unsupported format");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    authEncryptionKey,
    Buffer.from(encodedIv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64"));
  const json = Buffer.concat([
    decipher.update(Buffer.from(encodedData, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(json, BufferJSON.reviver) as T;
}

async function createPostgresAuthState(): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const repository = AppDataSource.getRepository(WhatsAppAuthState);
  const storedCreds = await repository.findOneBy({ key: "creds" });
  const creds = storedCreds
    ? deserializeAuthValue<AuthenticationCreds>(storedCreds.value)
    : initAuthCreds();

  const keyStore: SignalKeyStore = {
    async get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]) {
      const rows = await repository.findBy({
        key: In(ids.map((id) => `${type}-${id}`)),
      });
      const result: Record<string, SignalDataTypeMap[T]> = {};
      for (const row of rows) {
        const id = row.key.slice(type.length + 1);
        result[id] = deserializeAuthValue<SignalDataTypeMap[T]>(row.value);
      }
      return result;
    },
    async set(data) {
      for (const [type, entries] of Object.entries(data) as Array<
        [keyof SignalDataTypeMap, Record<string, unknown | null>]
      >) {
        await Promise.all(
          Object.entries(entries).map(([id, value]) => {
            const key = `${type}-${id}`;
            if (value === null)
              return repository.delete({ key }).then(() => undefined);
            return AppDataSource.query(
              `INSERT INTO whatsapp_auth_state (key, value)
               VALUES ($1, $2::jsonb)
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
              [key, JSON.stringify(serializeAuthValue(value))],
            ).then(() => undefined);
          }),
        );
      }
    },
    async clear() {
      await repository.clear();
    },
  };

  return {
    state: {
      creds,
      keys: makeCacheableSignalKeyStore(keyStore, pino({ level: "silent" })),
    },
    saveCreds: async () => {
      await AppDataSource.query(
        `INSERT INTO whatsapp_auth_state (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        ["creds", JSON.stringify(serializeAuthValue(creds))],
      );
    },
  };
}

class WhatsAppService {
  private sock: WASocket | null = null;
  private status: WhatsAppStatusPayload["status"] = "disconnected";
  private currentQrDataUrl: string | null = null;
  private userPhone: string | null = null;
  private syncTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitializing = false;
  private pendingAlerts: PendingAlert[] = [];
  private syncTimeoutMs = 60000;

  public getStatus(): WhatsAppStatusPayload {
    return {
      status: this.status,
      qrCode: this.currentQrDataUrl,
      userPhone: this.userPhone,
    };
  }

  public isConnected() {
    return this.status === "connected" && !!this.sock;
  }

  /** Normalize Nepal / international numbers to digits with country code when possible */
  public normalizePhone(input: string): string {
    let digits = (input || "").replace(/\D/g, "");
    if (!digits) return "";

    // Local Nepal mobiles: 98xxxxxxx / 97xxxxxxx (10 digits)
    if (digits.length === 10 && /^(97|98)\d{8}$/.test(digits)) {
      digits = `977${digits}`;
    }
    // Already has country code without +
    return digits;
  }

  public async initialize(): Promise<void> {
    if (this.isInitializing) {
      console.log("[WhatsApp] Initialize already in progress — skipping");
      return;
    }
    if (this.status === "connected" && this.sock) {
      console.log("[WhatsApp] Already connected — skipping initialize");
      return;
    }

    this.isInitializing = true;
    this.clearReconnectTimer();

    try {
      // Tear down previous socket cleanly to avoid 440 conflict loops
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners("connection.update");
          this.sock.ev.removeAllListeners("creds.update");
          this.sock.ev.removeAllListeners("messages.upsert");
          this.sock.end(undefined);
        } catch {
          // ignore
        }
        this.sock = null;
      }

      console.log("[WhatsApp] Initializing session from Supabase PostgreSQL");
      this.updateStatus("connecting", this.currentQrDataUrl);
      this.startSyncWatchdog();

      const { state, saveCreds } = await createPostgresAuthState();

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: ["The Lantern Stay", "Chrome", "1.0.0"],
        syncFullHistory: false,
        connectTimeoutMs: 45_000,
        markOnlineOnConnect: false,
      });

      this.sock.ev.on("creds.update", () => {
        void saveCreds().catch((error) => {
          console.error("[WhatsApp] Failed to persist credentials:", error);
        });
      });

      this.sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const dataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 300,
              color: { dark: "#1c1917", light: "#ffffff" },
            });
            this.currentQrDataUrl = dataUrl;
            this.updateStatus("qr_ready", dataUrl);
            // Keep waiting for scan — don't wipe session on QR wait
            this.clearSyncWatchdog();
            console.log("[WhatsApp] QR ready — scan from Admin → WhatsApp");
          } catch (qrErr) {
            console.error("[WhatsApp] Failed to generate QR:", qrErr);
          }
        }

        if (connection === "close") {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const loggedOut = reason === DisconnectReason.loggedOut;
          // 440 = connection replaced by another open socket — back off harder
          const conflict =
            reason === 440 || reason === DisconnectReason.connectionReplaced;

          console.log(
            `[WhatsApp] Connection closed. Reason: ${reason}. LoggedOut: ${loggedOut}`,
          );
          this.userPhone = null;

          if (loggedOut) {
            await this.resetSession();
            return;
          }

          this.updateStatus("connecting", this.currentQrDataUrl);
          const delay = conflict ? 8000 : 4000;
          this.scheduleReconnect(delay);
        } else if (connection === "open") {
          this.clearSyncWatchdog();
          this.clearReconnectTimer();
          const jid = this.sock?.user?.id || "";
          this.userPhone = jid.split(":")[0] || jid.split("@")[0] || null;
          this.currentQrDataUrl = null;
          this.updateStatus("connected", null);
          console.log(
            `[WhatsApp] Connected successfully! Account: ${this.userPhone}`,
          );
          void this.flushPendingAlerts();
          void this.resendLatestBookingIfNeeded();
        }
      });

      this.sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;

        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;
          const remoteJid = msg.key.remoteJid;
          if (!remoteJid || remoteJid === "status@broadcast") continue;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            "";
          if (!text.trim()) continue;

          const participantId =
            (msg.key as { participant?: string; remoteJidAlt?: string })
              .participant ||
            (msg.key as { remoteJidAlt?: string }).remoteJidAlt;
          const resolvedPhone = this.normalizePhone(
            await this.resolvePhoneNumber(remoteJid, participantId),
          );
          const senderName = msg.pushName || null;

          console.log(
            `[WhatsApp] Incoming from +${resolvedPhone}: "${text.slice(0, 80)}"`,
          );

          let savedMsg: WhatsAppMessage | null = null;
          try {
            if (AppDataSource.isInitialized) {
              const msgRepo = AppDataSource.getRepository(WhatsAppMessage);
              savedMsg = await msgRepo.save(
                msgRepo.create({
                  remoteJid,
                  phoneNumber: resolvedPhone,
                  senderName,
                  direction: "incoming",
                  messageText: text,
                  whatsappMessageId: msg.key.id || null,
                  status: "received",
                }),
              );
            }
          } catch (dbErr) {
            console.error("[WhatsApp] Failed to save incoming message:", dbErr);
          }

          broadcastWhatsAppMessage(
            savedMsg || {
              id: msg.key.id || Date.now().toString(),
              remoteJid,
              phoneNumber: resolvedPhone,
              senderName,
              direction: "incoming",
              messageText: text,
              createdAt: new Date(),
            },
          );

          try {
            const { createWhatsAppReplyNotification } =
              await import("./notificationService");
            await createWhatsAppReplyNotification({
              phoneNumber: resolvedPhone,
              senderName,
              messageText: text,
            });
          } catch (notifyErr) {
            console.warn(
              "[WhatsApp] Failed to create admin notification:",
              notifyErr,
            );
          }
        }
      });
    } catch (error) {
      console.error("[WhatsApp] Initialization error:", error);
      this.updateStatus("error", null);
      this.scheduleReconnect(5000);
    } finally {
      this.isInitializing = false;
    }
  }

  private scheduleReconnect(delayMs: number) {
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      void this.initialize();
    }, delayMs);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startSyncWatchdog(): void {
    this.clearSyncWatchdog();
    this.syncTimeoutTimer = setTimeout(() => {
      if (this.status === "connected") return;
      // Don't wipe auth while waiting for QR scan
      if (this.status === "qr_ready") return;
      console.warn(
        "[WhatsApp] Connection hung — soft reconnect (keeping auth)",
      );
      this.scheduleReconnect(1000);
    }, this.syncTimeoutMs);
  }

  private clearSyncWatchdog(): void {
    if (this.syncTimeoutTimer) {
      clearTimeout(this.syncTimeoutTimer);
      this.syncTimeoutTimer = null;
    }
  }

  public async resetSession(): Promise<void> {
    console.log("[WhatsApp] Resetting session & clearing auth...");
    this.clearSyncWatchdog();
    this.clearReconnectTimer();
    this.isInitializing = false;

    try {
      if (this.sock) {
        try {
          this.sock.ev.removeAllListeners("connection.update");
          this.sock.ev.removeAllListeners("creds.update");
          this.sock.ev.removeAllListeners("messages.upsert");
          this.sock.end(undefined);
        } catch {
          // ignore
        }
        this.sock = null;
      }
      if (AppDataSource.isInitialized) {
        await AppDataSource.getRepository(WhatsAppAuthState).clear();
      }
    } catch (err) {
      console.error("[WhatsApp] Error clearing stored auth state:", err);
    }

    this.currentQrDataUrl = null;
    this.userPhone = null;
    this.updateStatus("connecting", null);
    this.scheduleReconnect(1200);
  }

  private updateStatus(
    status: WhatsAppStatusPayload["status"],
    qrCode: string | null,
  ): void {
    this.status = status;
    this.currentQrDataUrl = qrCode;
    broadcastWhatsAppStatus({
      status,
      qrCode,
      userPhone: this.userPhone,
    });
  }

  public async resolvePhoneNumber(
    jidOrPhone: string,
    participant?: string | null,
  ): Promise<string> {
    const target = participant || jidOrPhone;
    const cleanDigits = target.split("@")[0].split(":")[0].replace(/\D/g, "");

    try {
      const mapping = await AppDataSource.getRepository(
        WhatsAppAuthState,
      ).findOneBy({
        key: `lid-mapping-${cleanDigits}_reverse`,
      });
      if (mapping) {
        const phoneNumber = deserializeAuthValue<string>(mapping.value);
        if (phoneNumber.length >= 7) return this.normalizePhone(phoneNumber);
      }
    } catch {
      // ignore
    }

    return this.normalizePhone(cleanDigits);
  }

  public async sendMessage(toPhone: string, text: string): Promise<boolean> {
    if (!this.sock || this.status !== "connected") {
      throw new Error(
        "WhatsApp is not connected. Please scan the QR code first.",
      );
    }

    const cleanPhone = this.normalizePhone(toPhone);
    if (!cleanPhone) {
      throw new Error("Invalid phone number format.");
    }

    const remoteJid = `${cleanPhone}@s.whatsapp.net`;

    try {
      const result = await this.sock.sendMessage(remoteJid, { text });

      let savedMsg: WhatsAppMessage | null = null;
      try {
        if (AppDataSource.isInitialized) {
          const msgRepo = AppDataSource.getRepository(WhatsAppMessage);
          savedMsg = await msgRepo.save(
            msgRepo.create({
              remoteJid,
              phoneNumber: cleanPhone,
              senderName: "The Lantern Stay (Admin)",
              direction: "outgoing",
              messageText: text,
              whatsappMessageId: result?.key?.id || null,
              status: "sent",
            }),
          );
        }
      } catch (dbErr) {
        console.error("[WhatsApp] Failed to save outgoing message:", dbErr);
      }

      broadcastWhatsAppMessageSent(
        savedMsg || {
          id: result?.key?.id || Date.now().toString(),
          remoteJid,
          phoneNumber: cleanPhone,
          senderName: "Admin",
          direction: "outgoing",
          messageText: text,
          createdAt: new Date(),
        },
      );

      return true;
    } catch (err) {
      console.error(`[WhatsApp] Failed to send message to ${toPhone}:`, err);
      throw err;
    }
  }

  private buildAlertMessage(booking: PendingAlert) {
    const customerPhoneClean = this.normalizePhone(booking.customerPhone);
    const dateFormatted = booking.bookingDate;
    const timeFormatted = booking.bookingTime || "Anytime / Flexible";
    const notesFormatted = booking.customerNotes?.trim() || "None";
    const timestampFormatted =
      booking.timestamp ||
      new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });

    const adminMessage = `📅 *New Booking Received*

👤 *Customer:* ${booking.customerName}
📱 *Phone:* +${customerPhoneClean || "N/A"}
📧 *Email:* ${booking.customerEmail}
🛎️ *Service/Item:* ${booking.bookingItem}
🗓️ *Date & Time:* ${dateFormatted} at ${timeFormatted}
💬 *Special Requests:* 
${notesFormatted}

👉 *Direct Reply:* https://wa.me/${customerPhoneClean}
🕐 *Booked At:* ${timestampFormatted}`;

    const customerMsg = `✨ *Booking Received - The Lantern Stay*

Dear *${booking.customerName}*,
Thank you for your reservation at *The Lantern Stay*!

🛎️ *Stay:* ${booking.bookingItem}
🗓️ *Date & Time:* ${dateFormatted} at ${timeFormatted}
💬 *Special Requests:* 
${notesFormatted}

We have received your details and our team will coordinate your check-in. You can reply directly to this chat for any inquiries! 🌿`;

    return { adminMessage, customerMsg, customerPhoneClean };
  }

  private async deliverAlert(booking: PendingAlert): Promise<void> {
    const adminPhone =
      this.normalizePhone(env.ADMIN_NOTIFY_PHONE || "") || this.userPhone;
    if (!adminPhone) {
      throw new Error("No ADMIN_NOTIFY_PHONE configured");
    }

    const { adminMessage, customerMsg, customerPhoneClean } =
      this.buildAlertMessage(booking);

    await this.sendMessage(adminPhone, adminMessage);
    console.log(`[WhatsApp] Booking alert sent to admin +${adminPhone}`);

    const adminClean = this.normalizePhone(adminPhone);
    if (customerPhoneClean && customerPhoneClean !== adminClean) {
      try {
        await this.sendMessage(customerPhoneClean, customerMsg);
        console.log(
          `[WhatsApp] Confirmation sent to customer +${customerPhoneClean}`,
        );
      } catch (custErr) {
        console.warn(
          `[WhatsApp] Could not send confirmation to customer +${customerPhoneClean}:`,
          custErr,
        );
      }
    }
  }

  private async flushPendingAlerts() {
    if (!this.pendingAlerts.length) return;
    console.log(
      `[WhatsApp] Flushing ${this.pendingAlerts.length} queued booking alert(s)...`,
    );
    const queue = [...this.pendingAlerts];
    this.pendingAlerts = [];
    for (const alert of queue) {
      try {
        await this.deliverAlert(alert);
      } catch (err) {
        console.error("[WhatsApp] Failed to flush queued alert:", err);
        this.pendingAlerts.push(alert);
      }
    }
  }

  /** After reconnect, re-notify the newest pending booking from the last hour */
  private async resendLatestBookingIfNeeded() {
    try {
      if (!AppDataSource.isInitialized) return;
      const { Booking } = await import("../entities/Booking");
      const bookingRepo = AppDataSource.getRepository(Booking);
      const latest = await bookingRepo.findOne({
        where: {},
        relations: ["property"],
        order: { createdAt: "DESC" },
      });
      if (!latest) return;

      const ageMs = Date.now() - new Date(latest.createdAt).getTime();
      if (ageMs > 60 * 60 * 1000) return; // only last hour

      await this.deliverAlert({
        customerName: latest.customerName || "Guest",
        customerPhone: latest.customerPhone || "",
        customerEmail: latest.customerEmail || "",
        bookingItem: latest.property?.title || "Stay",
        bookingDate: `${latest.checkIn} → ${latest.checkOut}`,
        bookingTime: latest.bookingTime || "14:00",
        customerNotes: latest.guestMessage,
      });
      console.log(`[WhatsApp] Re-sent alert for latest booking ${latest.id}`);
    } catch (err) {
      console.warn("[WhatsApp] Could not re-send latest booking alert:", err);
    }
  }

  /**
   * Sends booking alert to ADMIN_NOTIFY_PHONE.
   * If WhatsApp is offline, queues the alert and delivers once connected.
   */
  public async sendBookingAlert(booking: PendingAlert): Promise<void> {
    const adminPhone =
      this.normalizePhone(env.ADMIN_NOTIFY_PHONE || "") || this.userPhone;

    if (!adminPhone && !this.isConnected()) {
      console.warn(
        "[WhatsApp] No notify phone and not connected — queuing alert anyway",
      );
    }

    if (!this.isConnected()) {
      this.pendingAlerts.push(booking);
      // Keep a short queue so we don't grow forever
      if (this.pendingAlerts.length > 30) {
        this.pendingAlerts = this.pendingAlerts.slice(-30);
      }
      console.warn(
        `[WhatsApp] Not connected — queued booking alert (${this.pendingAlerts.length} pending). Scan QR in Admin → WhatsApp.`,
      );
      return;
    }

    try {
      await this.deliverAlert(booking);
    } catch (err) {
      this.pendingAlerts.push(booking);
      console.error("[WhatsApp] Send failed — queued for retry:", err);
    }
  }
}

export const whatsappService = new WhatsAppService();
