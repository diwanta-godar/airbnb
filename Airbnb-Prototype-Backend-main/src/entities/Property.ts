import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  Index,
} from "typeorm";
import { PropertyType } from "./enums";
import type { User } from "./User";
import type { PropertyImage } from "./PropertyImage";
import type { Booking } from "./Booking";
import type { Review } from "./Review";
import type { Amenity } from "./Amenity";
import type { Wishlist } from "./Wishlist";

@Entity("properties")
export class Property {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  slug!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "enum", enum: PropertyType, default: PropertyType.ENTIRE_HOME })
  propertyType!: PropertyType;

  @Column({ type: "varchar", length: 255 })
  address!: string;

  @Column({ type: "varchar", length: 100, default: "Kathmandu" })
  city!: string;

  @Column({ type: "varchar", length: 100, default: "Bagmati" })
  state!: string;

  @Column({ type: "varchar", length: 100, default: "Nepal" })
  country!: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude!: string | null;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  longitude!: string | null;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  pricePerNight!: string;

  @Column({ type: "varchar", length: 3, default: "NPR" })
  currency!: string;

  @Column({ type: "int", default: 1 })
  maxGuests!: number;

  @Column({ type: "int", default: 1 })
  bedrooms!: number;

  @Column({ type: "int", default: 1 })
  beds!: number;

  @Column({ type: "decimal", precision: 3, scale: 1, default: 1 })
  bathrooms!: string;

  @Column({ type: "int", default: 1 })
  cleaningFee!: number;

  @Column({ type: "int", default: 0 })
  serviceFeePercent!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  isFeatured!: boolean;

  @Column({ type: "decimal", precision: 3, scale: 2, default: 0 })
  averageRating!: string;

  @Column({ type: "int", default: 0 })
  reviewCount!: number;

  @Column({ type: "uuid" })
  hostId!: string;

  @ManyToOne("User", "properties", { onDelete: "CASCADE" })
  @JoinColumn({ name: "hostId" })
  host!: User;

  @OneToMany("PropertyImage", "property", { cascade: true })
  images!: PropertyImage[];

  @OneToMany("Booking", "property")
  bookings!: Booking[];

  @OneToMany("Review", "property")
  reviews!: Review[];

  @OneToMany("Wishlist", "property")
  wishlists!: Wishlist[];

  @ManyToMany("Amenity", "properties", { cascade: true })
  @JoinTable({ name: "property_amenities" })
  amenities!: Amenity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
