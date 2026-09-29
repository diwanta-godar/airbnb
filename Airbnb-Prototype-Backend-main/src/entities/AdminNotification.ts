import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type AdminNotificationType = "whatsapp_reply" | "booking" | "system";

@Entity("admin_notifications")
@Index(["isRead", "createdAt"])
export class AdminNotification {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 40, default: "whatsapp_reply" })
  type!: AdminNotificationType;

  @Column({ type: "varchar", length: 200 })
  title!: string;

  @Column({ type: "text" })
  body!: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phoneNumber!: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  senderName!: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  href!: string | null;

  @Column({ type: "boolean", default: false })
  isRead!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
