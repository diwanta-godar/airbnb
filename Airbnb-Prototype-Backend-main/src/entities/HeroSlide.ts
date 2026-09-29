import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("hero_slides")
@Index(["isActive", "sortOrder"])
export class HeroSlide {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text", nullable: true })
  subtitle!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  primaryCtaLabel!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  primaryCtaHref!: string | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  secondaryCtaLabel!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  secondaryCtaHref!: string | null;

  @Column({ type: "varchar", length: 1000 })
  imageUrl!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  imageAlt!: string | null;

  @Column({ type: "int", default: 0 })
  sortOrder!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
