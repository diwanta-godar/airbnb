import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("whatsapp_auth_state")
export class WhatsAppAuthState {
  @PrimaryColumn({ type: "varchar", length: 255 })
  key!: string;

  @Column({ type: "jsonb" })
  value!: unknown;
}
