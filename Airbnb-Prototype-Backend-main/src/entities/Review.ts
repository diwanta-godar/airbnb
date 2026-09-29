import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";
import type { User } from "./User";
import type { Property } from "./Property";
import type { Booking } from "./Booking";

@Entity("reviews")
@Unique(["authorId", "propertyId", "bookingId"])
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "int" })
  rating!: number;

  @Column({ type: "text" })
  comment!: string;

  @Column({ type: "int", nullable: true })
  cleanliness!: number | null;

  @Column({ type: "int", nullable: true })
  communication!: number | null;

  @Column({ type: "int", nullable: true })
  location!: number | null;

  @Column({ type: "int", nullable: true })
  value!: number | null;

  @Column({ type: "uuid" })
  authorId!: string;

  @Column({ type: "uuid" })
  propertyId!: string;

  @Column({ type: "uuid" })
  bookingId!: string;

  @ManyToOne("User", "reviews", { onDelete: "CASCADE" })
  @JoinColumn({ name: "authorId" })
  author!: User;

  @ManyToOne("Property", "reviews", { onDelete: "CASCADE" })
  @JoinColumn({ name: "propertyId" })
  property!: Property;

  @ManyToOne("Booking", { onDelete: "CASCADE" })
  @JoinColumn({ name: "bookingId" })
  booking!: Booking;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
