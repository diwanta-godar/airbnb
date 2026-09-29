import "reflect-metadata";
import { DataSource } from "typeorm";
import { env, isProd } from "./env";
import { User } from "../entities/User";
import { Property } from "../entities/Property";
import { PropertyImage } from "../entities/PropertyImage";
import { Booking } from "../entities/Booking";
import { Review } from "../entities/Review";
import { Wishlist } from "../entities/Wishlist";
import { RefreshToken } from "../entities/RefreshToken";
import { Amenity } from "../entities/Amenity";
import { WhatsAppMessage } from "../entities/WhatsAppMessage";
import { AdminNotification } from "../entities/AdminNotification";
import { HeroSlide } from "../entities/HeroSlide";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  synchronize: false,
  logging: env.DB_LOGGING || !isProd,
  entities: [
    User,
    Property,
    PropertyImage,
    Booking,
    Review,
    Wishlist,
    RefreshToken,
    Amenity,
    WhatsAppMessage,
    AdminNotification,
    HeroSlide,
  ],
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
});

async function migrateLegacyUserRoles() {
  try {
    // Flatten legacy postgres enum (guest/host) into varchar user/admin.
    await AppDataSource.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'role'
        ) THEN
          ALTER TABLE users
            ALTER COLUMN role TYPE varchar(20)
            USING (
              CASE lower(role::text)
                WHEN 'guest' THEN 'user'
                WHEN 'host' THEN 'admin'
                WHEN 'user' THEN 'user'
                WHEN 'admin' THEN 'admin'
                ELSE 'user'
              END
            );
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END $$;
    `);

    // Ensure known company accounts stay admin after role migrations.
    await AppDataSource.query(`
      UPDATE users
      SET role = 'admin'
      WHERE lower(email) IN (
        'thelanternstay@gmail.com',
        'admin@thelanternstay.com'
      )
    `);
  } catch (err) {
    console.warn("[DB] Role migration skipped:", err);
  }
}

export async function ensureSchema() {
  const rows = (await AppDataSource.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS "exists"
  `)) as Array<{ exists: boolean }>;

  const tablesExist = Boolean(rows[0]?.exists);

  if (!tablesExist || env.DB_SYNCHRONIZE) {
    console.log(
      tablesExist
        ? "DB_SYNCHRONIZE=true — updating schema..."
        : "Database tables missing — creating schema..."
    );
  }

  await migrateLegacyUserRoles();
  await AppDataSource.synchronize();
  await seedDefaultHeroSlides();
  console.log("Database schema is ready");
}

async function seedDefaultHeroSlides() {
  try {
    const repo = AppDataSource.getRepository(HeroSlide);
    const count = await repo.count();
    if (count > 0) return;

    await repo.save([
      repo.create({
        title: "The Lantern Stay",
        subtitle:
          "Cozy vacation home rental in Kathmandu. Quiet mornings, warm evenings, and a restful place to stay.",
        primaryCtaLabel: "Browse stays",
        primaryCtaHref: "/stays",
        secondaryCtaLabel: "Contact us",
        secondaryCtaHref: "/contact",
        imageUrl:
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=2000&q=85",
        imageAlt: "Lantern-lit vacation home exterior in Kathmandu",
        sortOrder: 0,
        isActive: true,
      }),
      repo.create({
        title: "Bright living spaces",
        subtitle:
          "Homes with soft light, clean linen, and room to unwind after a day in the city.",
        primaryCtaLabel: "See featured stays",
        primaryCtaHref: "/stays",
        secondaryCtaLabel: "About us",
        secondaryCtaHref: "/about",
        imageUrl:
          "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=2000&q=85",
        imageAlt: "Bright living space at The Lantern Stay",
        sortOrder: 1,
        isActive: true,
      }),
      repo.create({
        title: "Restful bedrooms",
        subtitle:
          "Quiet suites with reliable hot water and everything you need for a good night's sleep.",
        primaryCtaLabel: "Browse stays",
        primaryCtaHref: "/stays",
        secondaryCtaLabel: "Book now",
        secondaryCtaHref: "/contact",
        imageUrl:
          "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=2000&q=85",
        imageAlt: "Comfortable bedroom suite with soft evening light",
        sortOrder: 2,
        isActive: true,
      }),
      repo.create({
        title: "Stay near Kathmandu life",
        subtitle:
          "Heritage courtyards nearby, a calm home to return to — hosted by The Lantern Stay.",
        primaryCtaLabel: "Explore stays",
        primaryCtaHref: "/stays",
        secondaryCtaLabel: "Contact us",
        secondaryCtaHref: "/contact",
        imageUrl:
          "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=2000&q=85",
        imageAlt: "Heritage home facade near Kathmandu courtyards",
        sortOrder: 3,
        isActive: true,
      }),
    ]);
    console.log("Seeded default hero slides");
  } catch (err) {
    console.warn("[DB] Hero slide seed skipped:", err);
  }
}

