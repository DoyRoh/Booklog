"use client";

import { useRef, useState } from "react";

type Props = {
  onSelect: (file: File | null) => void;
  label?: string;
  // 기록 고치기 모달처럼 이미 업로드된 사진이 있을 때, 그 사진을 보여주고
  // 바꾸거나 지울 수 있게 한다. 새로 파일을 고르면 onSelect로 그 파일이
  // 넘어가고(부모가 새로 업로드), 지우면 onRemoveExisting이 한 번 불린다
  // (부모가 photo_url을 null로 저장).
  existingUrl?: string | null;
  onRemoveExisting?: () => void;
};

export default function PhotoPicker({
  onSelect,
  label = "사진 첨부",
  existingUrl = null,
  onRemoveExisting,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingRemoved, setExistingRemoved] = useState(false);

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

  function removeExisting() {
    setExistingRemoved(true);
    onRemoveExisting?.();
  }

  const showingExisting = !previewUrl && !existingRemoved && Boolean(existingUrl);

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleChange}
      className="hidden"
    />
  );

  if (previewUrl) {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="" className="h-16 w-16 rounded-[10px] object-cover" />
        <button type="button" onClick={clear} className="d text-sm" style={{ color: "var(--berry)" }}>
          사진 지우기
        </button>
        {fileInput}
      </div>
    );
  }

  if (showingExisting) {
    return (
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={existingUrl!} alt="" className="h-16 w-16 rounded-[10px] object-cover" />
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="d text-sm"
            style={{ color: "var(--point)" }}
          >
            사진 바꾸기
          </button>
          <button type="button" onClick={removeExisting} className="d text-sm" style={{ color: "var(--berry)" }}>
            사진 지우기
          </button>
        </div>
        {fileInput}
      </div>
    );
  }

  return (
    <label
      className="d flex w-fit cursor-pointer items-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm"
      style={{ borderColor: "var(--rule)", background: "var(--card)" }}
    >
      {label}
      {fileInput}
    </label>
  );
}
