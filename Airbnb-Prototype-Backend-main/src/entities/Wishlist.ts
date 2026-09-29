import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from "typeorm";
import type { User } from "./User";
import type { Property } from "./Property";

@Entity("wishlists")
@Unique(["userId", "propertyId"])
export class Wishlist {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "uuid" })
  propertyId!: string;

  @ManyToOne("User", "wishlists", { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne("Property", "wishlists", { onDelete: "CASCADE" })
  @JoinColumn({ name: "propertyId" })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;
}
