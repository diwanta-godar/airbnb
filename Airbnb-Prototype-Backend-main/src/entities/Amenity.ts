import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  Index,
} from "typeorm";
import type { Property } from "./Property";

@Entity("amenities")
export class Amenity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ type: "varchar", length: 100 })
  name!: string;

  @Column({ type: "varchar", length: 50 })
  icon!: string;

  @Column({ type: "varchar", length: 50, default: "general" })
  category!: string;

  @ManyToMany("Property", "amenities")
  properties!: Property[];

  @CreateDateColumn()
  createdAt!: Date;
}
