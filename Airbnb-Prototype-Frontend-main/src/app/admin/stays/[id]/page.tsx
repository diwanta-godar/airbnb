"use client";

import { use } from "react";
import StayEditor from "@/components/admin/StayEditor";

export default function EditStayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <StayEditor propertyId={id} />;
}
