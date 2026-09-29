import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type MessageDirection = "incoming" | "outgoing";

@Entity("whatsapp_messages")
@Index(["phoneNumber", "createdAt"])
export class WhatsAppMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  remoteJid!: string;

  @Column({ type: "varchar", length: 50 })
  phoneNumber!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  senderName!: string | null;

  @Column({ type: "varchar", length: 20 })
  direction!: MessageDirection;

  @Column({ type: "text" })
  messageText!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  whatsappMessageId!: string | null;

  @Column({ type: "varchar", length: 50, default: "received" })
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

