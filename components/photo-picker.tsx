"use client";

import { useRef, useState } from "react";

type Props = {
  onSelect: (file: File | null) => void;
  label?: string;
};

export default function PhotoPicker({ onSelect, label = "사진 첨부" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
    onSelect(file);
  }

  function clear() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-3">
      {previewUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className="h-16 w-16 rounded-[10px] object-cover" />
          <button
            type="button"
            onClick={clear}
            className="d text-sm"
            style={{ color: "var(--berry)" }}
          >
            사진 지우기
          </button>
        </div>
      ) : (
        <label
          className="d flex cursor-pointer items-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm"
          style={{ borderColor: "var(--rule)", background: "var(--card)" }}
        >
          {label}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}
