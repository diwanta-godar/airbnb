export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export interface PropertyImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
}

export interface PropertyHost {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  propertyType: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: string | null;
  longitude: string | null;
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
  hostId: string;
  host?: PropertyHost | User;
  images: PropertyImage[];
  amenities?: Amenity[];
  reviews?: Review[];
  createdAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  cleanliness: number | null;
  communication: number | null;
  location: number | null;
  value: number | null;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
  createdAt: string;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "rejected";

export interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  pricePerNight: string;
  cleaningFee: string;
  serviceFee: string;
  totalPrice: string;
  currency: string;
  status: BookingStatus;
  guestMessage: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  bookingTime?: string | null;
  property?: Property;
  guest?: User;
  createdAt: string;
}

export interface PaginatedProperties {
  items: Property[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminStats {
  properties: number;
  bookings: number;
  users: number;
  pendingBookings: number;
}

export interface WhatsAppStatus {
  status: "disconnected" | "connecting" | "qr_ready" | "connected" | "error";
  qrCode: string | null;
  userPhone?: string | null;
  error?: string | null;
}

export interface WhatsAppMessage {
  id: string;
  remoteJid: string;
  phoneNumber: string;
  senderName: string | null;
  direction: "incoming" | "outgoing";
  messageText: string;
  whatsappMessageId: string | null;
  status: string;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  type: "whatsapp_reply" | "booking" | "system";
  title: string;
  body: string;
  phoneNumber: string | null;
  senderName: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  primaryCtaLabel: string | null;
  primaryCtaHref: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaHref: string | null;
  imageUrl: string;
  imageAlt: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationsPayload {
  items: AdminNotification[];
  unreadCount: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  details?: unknown;
}
