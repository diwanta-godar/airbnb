import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import type { Property } from "./Property";

@Entity("property_images")
export class PropertyImage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 1000 })
  url!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  alt!: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "boolean", default: false })
  isCover!: boolean;

  @Column({ type: "uuid" })
  propertyId!: string;

  @ManyToOne("Property", "images", { onDelete: "CASCADE" })
  @JoinColumn({ name: "propertyId" })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;
}
