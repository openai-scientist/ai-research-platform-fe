"use client";

import { useState } from "react";

import type { FileManagerFile } from "./data";

/** Keep local favorite choices while rendering the latest files from the caller. */
export function useFileStars(files: FileManagerFile[]) {
  const [starred, setStarred] = useState<Record<string, boolean>>({});

  function toggleStar(fileId: string) {
    const file = files.find((item) => item.id === fileId);
    if (!file) return;
    setStarred((current) => ({ ...current, [fileId]: !(current[fileId] ?? file.starred) }));
  }

  return {
    files: files.map((file) => (starred[file.id] === undefined ? file : { ...file, starred: starred[file.id] })),
    toggleStar,
  };
}
