"use client";

import { useEffect, useState } from "react";

export function VideoPreviewList({
  files,
  onRemove,
}: {
  files: File[];
  onRemove: (index: number) => void;
}) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    const objectUrls = files.map((file) => URL.createObjectURL(file));
    setUrls(objectUrls);
    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {files.map((file, i) => (
        <div key={`${file.name}-${file.lastModified}-${i}`} className="relative">
          {urls[i] && (
            <video src={urls[i]} controls className="h-24 rounded-md" />
          )}
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label="Annuler cette vidéo"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
