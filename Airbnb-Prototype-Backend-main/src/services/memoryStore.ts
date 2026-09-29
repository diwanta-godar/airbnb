export interface MemoryProperty {
  id: string;
  slug: string;
  title: string;
  description: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pricePerNight: string;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: string;
  cleaningFee: number;
  serviceFeePercent: number;
  isActive: boolean;
  isFeatured: boolean;
  averageRating: string;
  reviewCount: number;
  images: { url: string; isCover: boolean }[];
}

export const FALLBACK_PROPERTIES: MemoryProperty[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    slug: "the-lantern-heritage-suite",
    title: "The Lantern Heritage Suite",
    description: "Tranquil retreat overlooking the Kathmandu valley with traditional Newari woodwork and modern luxury.",
    propertyType: "entire_home",
    address: "Patan Durbar Area",
    city: "Lalitpur",
    state: "Bagmati",
    country: "Nepal",
    pricePerNight: "12500.00",
    currency: "NPR",
    maxGuests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: "2.0",
    cleaningFee: 1500,
    serviceFeePercent: 10,
    isActive: true,
    isFeatured: true,
    averageRating: "4.95",
    reviewCount: 48,
    images: [
      {
        url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
        isCover: true,
      },
      {
        url: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80",
        isCover: false,
      },
    ],
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    slug: "lakeside-lantern-villa",
    title: "Lakeside Lantern Villa",
    description: "Serene mountain and lake views in Pokhara with private garden, fireplace, and yoga deck.",
    propertyType: "entire_home",
    address: "Lakeside North",
    city: "Pokhara",
    state: "Gandaki",
    country: "Nepal",
    pricePerNight: "16800.00",
    currency: "NPR",
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: "2.5",
    cleaningFee: 2000,
    serviceFeePercent: 10,
    isActive: true,
    isFeatured: true,
    averageRating: "4.98",
    reviewCount: 32,
    images: [
      {
        url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80",
        isCover: true,
      },
    ],
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    slug: "nagarkot-sunrise-chalet",
    title: "Nagarkot Sunrise Chalet",
    description: "Panoramic Himalayan range vistas from your private terrace, surrounded by lush pine forests.",
    propertyType: "cabin",
    address: "Nagarkot Ridge",
    city: "Nagarkot",
    state: "Bagmati",
    country: "Nepal",
    pricePerNight: "9500.00",
    currency: "NPR",
    maxGuests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: "1.0",
    cleaningFee: 1000,
    serviceFeePercent: 10,
    isActive: true,
    isFeatured: true,
    averageRating: "4.91",
    reviewCount: 26,
    images: [
      {
        url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
        isCover: true,
      },
    ],
  },
];

import fs from "fs";
import path from "path";

function resolveLidToPhone(phoneOrLid: string): string {
  const clean = String(phoneOrLid).replace(/\D/g, "");
  try {
    const authDir = path.resolve(process.cwd(), "./whatsapp-auth");
    const reverseFile = path.resolve(authDir, `lid-mapping-${clean}_reverse.json`);
    if (fs.existsSync(reverseFile)) {
      const content = fs.readFileSync(reverseFile, "utf8").trim();
      const parsed = JSON.parse(content);
      if (typeof parsed === "string" && parsed.length >= 7) {
        return parsed.replace(/\D/g, "");
      }
    }
  } catch {
    // ignore
  }
  return clean;
}

class MemoryStore {
  public bookings: any[] = [];
  public messages: any[] = [];

  addBooking(booking: any) {
    this.bookings.unshift(booking);
    if (this.bookings.length > 50) this.bookings.pop();
  }

  getBookings() {
    return this.bookings;
  }

  addMessage(message: any) {
    const resolvedPhone = resolveLidToPhone(message.phoneNumber || message.remoteJid || "");
    const updated = {
      ...message,
      phoneNumber: resolvedPhone,
    };
    this.messages.push(updated);
    if (this.messages.length > 100) this.messages.shift();
  }

  getMessages() {
    return this.messages.map((m) => ({
      ...m,
      phoneNumber: resolveLidToPhone(m.phoneNumber || m.remoteJid || ""),
    }));
  }
}

export const memoryStore = new MemoryStore();
