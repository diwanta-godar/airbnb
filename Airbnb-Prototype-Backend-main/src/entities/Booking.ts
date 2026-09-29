import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { BookingStatus } from "./enums";
import type { User } from "./User";
import type { Property } from "./Property";

@Entity("bookings")
@Index(["propertyId", "checkIn", "checkOut"])
export class Booking {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "date" })
  checkIn!: string;

  @Column({ type: "date" })
  checkOut!: string;

  @Column({ type: "int" })
  guests!: number;

  @Column({ type: "int" })
  nights!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  pricePerNight!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  cleaningFee!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  serviceFee!: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  totalPrice!: string;

  @Column({ type: "varchar", length: 3, default: "NPR" })
  currency!: string;

  @Column({ type: "enum", enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @Column({ type: "text", nullable: true })
  guestMessage!: string | null;

  @Column({ type: "text", nullable: true })
  cancellationReason!: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  customerName!: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  customerPhone!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  customerEmail!: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  bookingTime!: string | null;

  @Column({ type: "uuid", nullable: true })
  guestId!: string | null;

  @Column({ type: "uuid" })
  propertyId!: string;

  @ManyToOne("User", "bookings", { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "guestId" })
  guest!: User | null;

  @ManyToOne("Property", "bookings", { onDelete: "CASCADE" })
  @JoinColumn({ name: "propertyId" })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
