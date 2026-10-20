"use client";

import { useParams } from "next/navigation";

import { SectionSkeleton } from "../_components/workspace-skeletons";

export default function Loading() {
  const { section } = useParams<{ section?: string }>();
  return <SectionSkeleton section={section} />;
}
