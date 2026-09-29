import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { UserRole } from "./enums";
import type { Property } from "./Property";
import type { Booking } from "./Booking";
import type { Review } from "./Review";
import type { Wishlist } from "./Wishlist";
import type { RefreshToken } from "./RefreshToken";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 255 })
  email!: string;

  @Column({ type: "varchar", length: 255, select: false })
  passwordHash!: string;

  @Column({ type: "varchar", length: 100 })
  firstName!: string;

  @Column({ type: "varchar", length: 100 })
  lastName!: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: "text", nullable: true })
  bio!: string | null;

  @Column({ type: "varchar", length: 20, default: UserRole.USER })
  role!: UserRole;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "boolean", default: false })
  emailVerified!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany("Property", "host")
  properties!: Property[];

  @OneToMany("Booking", "guest")
  bookings!: Booking[];

  @OneToMany("Review", "author")
  reviews!: Review[];

  @OneToMany("Wishlist", "user")
  wishlists!: Wishlist[];

  @OneToMany("RefreshToken", "user")
  refreshTokens!: RefreshToken[];
}
