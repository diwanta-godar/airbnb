import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { seedDatabase } from "./seed";

async function main() {
  const force = process.argv.includes("--force");

  await AppDataSource.initialize();
  console.log("PostgreSQL connected");

  // Prototype has no migrations — ensure tables exist before seeding (incl. production).
  await AppDataSource.synchronize();
  console.log("Database schema synchronized");

  await seedDatabase({ force });

  await AppDataSource.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
