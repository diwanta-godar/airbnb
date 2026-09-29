"use client";

import { use } from "react";
import HeroSlideEditor from "@/components/admin/HeroSlideEditor";

export default function EditHeroSlidePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <HeroSlideEditor slideId={id} />;
}
