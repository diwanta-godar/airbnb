import "reflect-metadata";
import http from "http";
import path from "path";
import express from "express";
import { AppDataSource, ensureSchema } from "./config/database";
import { env } from "./config/env";
import { applySecurity } from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import routes from "./routes";
import { seedDatabase } from "./seed/seed";
import { initSocketServer } from "./services/socketService";
import { whatsappService } from "./services/whatsappService";

async function bootstrap() {
  await AppDataSource.initialize();
  console.log("PostgreSQL connected");
  await ensureSchema();

  if (env.SEED_ON_START) {
    await seedDatabase();
  }

  const app = express();
  applySecurity(app);

  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), "uploads"), {
      maxAge: "7d",
      fallthrough: true,
    })
  );

  app.use("/api", routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = http.createServer(app);
  initSocketServer(server);

  server.listen(env.PORT, () => {
    console.log(`${env.APP_NAME} API running on http://localhost:${env.PORT}`);
    whatsappService.initialize().catch((err) => {
      console.error("[WhatsApp] Failed to initialize:", err);
    });
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
