import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Property } from "../entities/Property";
import { PropertyImage } from "../entities/PropertyImage";
import { Amenity } from "../entities/Amenity";
import { Review } from "../entities/Review";
import { Booking } from "../entities/Booking";
import { UserRole, PropertyType, BookingStatus } from "../entities/enums";
import { hashPassword } from "../utils/security";

const AMENITIES = [
  { name: "WiFi", icon: "wifi", category: "essentials" },
  { name: "Kitchen", icon: "kitchen", category: "essentials" },
  { name: "Air conditioning", icon: "ac", category: "essentials" },
  { name: "Heating", icon: "heating", category: "essentials" },
  { name: "Washer", icon: "washer", category: "essentials" },
  { name: "Free parking", icon: "parking", category: "parking" },
  { name: "Mountain view", icon: "mountain", category: "views" },
  { name: "Garden", icon: "garden", category: "outdoor" },
  { name: "Patio", icon: "patio", category: "outdoor" },
  { name: "Workspace", icon: "workspace", category: "workspace" },
  { name: "TV", icon: "tv", category: "entertainment" },
  { name: "Hot water", icon: "hotwater", category: "essentials" },
  { name: "Fire extinguisher", icon: "safety", category: "safety" },
  { name: "First aid kit", icon: "firstaid", category: "safety" },
  { name: "Smoke alarm", icon: "smoke", category: "safety" },
];

export async function seedDatabase(options: { force?: boolean } = {}) {
  const userRepo = AppDataSource.getRepository(User);
  const propertyRepo = AppDataSource.getRepository(Property);
  const amenityRepo = AppDataSource.getRepository(Amenity);

  const existing = await propertyRepo.count();
  if (existing > 0 && !options.force) {
    console.log("Seed skipped: data already present (use --force to wipe and reseed)");
    return;
  }

  if (options.force && existing > 0) {
    console.log("Force seed: clearing existing data...");
    await AppDataSource.query(`
      TRUNCATE TABLE
        reviews,
        bookings,
        wishlists,
        property_images,
        property_amenities,
        properties,
        amenities,
        refresh_tokens,
        users
      RESTART IDENTITY CASCADE
    `);
  }

  console.log("Seeding The Lantern Stay database...");

  const amenityEntities = await amenityRepo.save(
    AMENITIES.map((a) => amenityRepo.create(a))
  );

  const admin = await userRepo.save(
    userRepo.create({
      email: "thelanternstay@gmail.com",
      passwordHash: await hashPassword("LanternStay@2026"),
      firstName: "The Lantern",
      lastName: "Stay",
      phone: "+9779814818429",
      bio: "Cozy vacation home rental in Kathmandu. Warm hospitality, lantern-lit evenings, and a restful base for exploring the valley.",
      role: UserRole.ADMIN,
      emailVerified: true,
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    })
  );

  const user = await userRepo.save(
    userRepo.create({
      email: "guest@example.com",
      passwordHash: await hashPassword("GuestUser@2026"),
      firstName: "Aarav",
      lastName: "Shrestha",
      phone: "+9779700000000",
      role: UserRole.USER,
      emailVerified: true,
    })
  );

  const listings = [
    {
      title: "Lantern Courtyard Home in Kathmandu",
      slug: "lantern-courtyard-home",
      description:
        "A warm vacation home on a quiet Kathmandu lane. Wake to mountain light, cook in a full kitchen, and return to a courtyard garden after temple walks and cafe hops. Good for couples and small families.",
      propertyType: PropertyType.ENTIRE_HOME,
      address: "Thamel side lane, Kathmandu",
      pricePerNight: 8500,
      maxGuests: 4,
      bedrooms: 2,
      beds: 2,
      bathrooms: 1.5,
      cleaningFee: 1500,
      isFeatured: true,
      latitude: 27.715,
      longitude: 85.312,
      images: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
        "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80",
        "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80",
      ],
      amenityNames: ["WiFi", "Kitchen", "Air conditioning", "Garden", "Free parking", "Hot water", "TV", "Smoke alarm"],
    },
    {
      title: "Valley View Loft near Swayambhu",
      slug: "valley-view-loft-swayambhu",
      description:
        "Light-filled loft with soft evening views across the Kathmandu valley. Walking distance to Swayambhunath, cafes, and quiet residential streets. Ideal for remote workers and travelers who want space to breathe.",
      propertyType: PropertyType.ENTIRE_HOME,
      address: "Swayambhu area, Kathmandu",
      pricePerNight: 7200,
      maxGuests: 3,
      bedrooms: 1,
      beds: 2,
      bathrooms: 1,
      cleaningFee: 1200,
      isFeatured: true,
      latitude: 27.7149,
      longitude: 85.2903,
      images: [
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
        "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&q=80",
      ],
      amenityNames: ["WiFi", "Kitchen", "Workspace", "Mountain view", "Heating", "Hot water", "First aid kit"],
    },
    {
      title: "Garden Suite in a Quiet Neighborhood",
      slug: "garden-suite-residential",
      description:
        "A private suite opening onto a small garden. Soft linens, reliable hot water, and quiet mornings. Close enough to explore the city, calm enough to rest.",
      propertyType: PropertyType.PRIVATE_ROOM,
      address: "Boudha vicinity, Kathmandu",
      pricePerNight: 4500,
      maxGuests: 2,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      cleaningFee: 800,
      isFeatured: false,
      latitude: 27.7215,
      longitude: 85.3619,
      images: [
        "https://images.unsplash.com/photo-1616594039964-ae9021a400a9?w=1200&q=80",
        "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1200&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=80",
      ],
      amenityNames: ["WiFi", "Garden", "Patio", "Hot water", "Heating", "Fire extinguisher"],
    },
    {
      title: "Heritage Lane Apartment near Patan",
      slug: "heritage-lane-patan",
      description:
        "Stay steps from Patan's courtyards and craft workshops. This bright apartment blends traditional textures with modern comfort. A good base for museum days, cafe mornings, and evening square walks.",
      propertyType: PropertyType.ENTIRE_HOME,
      address: "Patan / Lalitpur border",
      pricePerNight: 6800,
      maxGuests: 4,
      bedrooms: 2,
      beds: 3,
      bathrooms: 1,
      cleaningFee: 1300,
      isFeatured: true,
      latitude: 27.6727,
      longitude: 85.3251,
      images: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80",
      ],
      amenityNames: ["WiFi", "Kitchen", "Washer", "Free parking", "TV", "Air conditioning", "Smoke alarm"],
    },
  ];

  for (const listing of listings) {
    const amenities = amenityEntities.filter((a) =>
      listing.amenityNames.includes(a.name)
    );

    const property = propertyRepo.create({
      title: listing.title,
      slug: listing.slug,
      description: listing.description,
      propertyType: listing.propertyType,
      address: listing.address,
      city: "Kathmandu",
      state: "Bagmati",
      country: "Nepal",
      latitude: listing.latitude.toString(),
      longitude: listing.longitude.toString(),
      pricePerNight: listing.pricePerNight.toFixed(2),
      currency: "NPR",
      maxGuests: listing.maxGuests,
      bedrooms: listing.bedrooms,
      beds: listing.beds,
      bathrooms: listing.bathrooms.toString(),
      cleaningFee: listing.cleaningFee,
      serviceFeePercent: 10,
      isFeatured: listing.isFeatured,
      isActive: true,
      hostId: admin.id,
      amenities,
      images: listing.images.map((url, index) => {
        const img = new PropertyImage();
        img.url = url;
        img.alt = listing.title;
        img.sortOrder = index;
        img.isCover = index === 0;
        return img;
      }),
    });

    await propertyRepo.save(property);
  }

  const courtyard = await propertyRepo.findOne({
    where: { slug: "lantern-courtyard-home" },
  });

  if (courtyard) {
    const bookingRepo = AppDataSource.getRepository(Booking);
    const reviewRepo = AppDataSource.getRepository(Review);

    const pastBooking = await bookingRepo.save(
      bookingRepo.create({
        propertyId: courtyard.id,
        guestId: user.id,
        checkIn: "2026-07-01",
        checkOut: "2026-07-04",
        guests: 2,
        nights: 3,
        pricePerNight: courtyard.pricePerNight,
        cleaningFee: courtyard.cleaningFee.toFixed(2),
        serviceFee: "2550.00",
        totalPrice: "29550.00",
        currency: "NPR",
        status: BookingStatus.COMPLETED,
        guestMessage: "Looking forward to a peaceful stay.",
        customerName: `${user.firstName} ${user.lastName}`,
        customerPhone: user.phone,
        customerEmail: user.email,
        bookingTime: "14:00",
      })
    );

    await reviewRepo.save(
      reviewRepo.create({
        bookingId: pastBooking.id,
        propertyId: courtyard.id,
        authorId: user.id,
        rating: 5,
        comment:
          "Exactly the cozy Kathmandu stay we hoped for. The courtyard was magical in the evenings and the host was incredibly thoughtful.",
        cleanliness: 5,
        communication: 5,
        location: 5,
        value: 5,
      })
    );

    courtyard.averageRating = "5.00";
    courtyard.reviewCount = 1;
    await propertyRepo.save(courtyard);
  }

  console.log("Seed complete");
  console.log("Admin:", admin.email, "| User:", user.email);
}
