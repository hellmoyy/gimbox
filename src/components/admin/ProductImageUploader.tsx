"use client";
import { useEffect, useRef, useState } from "react";

type Props = {
  defaultFolder?: string;
  defaultName?: string;
  onUploadedFieldName?: string; // primary single URL field (e.g. image/icon)
  variantsFieldName?: string; // optional textarea/hidden input to store responsive variants (one per line)
  onUploaded?: (url: string, variants?: string[]) => void;
};

export default function ProductImageUploader({ defaultFolder = "products", defaultName = "produk", onUploadedFieldName = "icon", variantsFieldName = "variants", onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // Initialize preview from existing hidden/text input if present
    const field = document.querySelector(`input[name="${onUploadedFieldName}"]`) as HTMLInputElement | null;
    if (field && field.value) setPreview(field.value);
  }, [onUploadedFieldName]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.match(/image\/(png|jpeg|jpg|webp)/)) {
      setError("Tipe file harus gambar (PNG/JPG/WEBP)");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Maksimal 5MB");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.set("file", f);
      data.set("folder", defaultFolder);
      data.set("name", defaultName);
      const res = await fetch("/api/admin/upload", { method: "POST", body: data });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Gagal upload");
      setPreview(j.url);
      // set primary field value (could be hidden readonly input)
      const field = document.querySelector(`input[name="${onUploadedFieldName}"]`) as HTMLInputElement | null;
      if (field) {
        field.value = j.url;
        // trigger input event so React onChange handlers can catch it
        const evt = new Event("input", { bubbles: true });
        field.dispatchEvent(evt);
      }
      // handle variants (banners only or when API returns them)
      if (j.variants && Array.isArray(j.variants) && j.variants.length) {
        const variantsField = document.querySelector(`[name="${variantsFieldName}"]`) as HTMLTextAreaElement | HTMLInputElement | null;
        if (variantsField) {
          variantsField.value = j.variants.join("\n");
          const evt2 = new Event("input", { bubbles: true });
          variantsField.dispatchEvent(evt2);
        }
      }
      if (onUploaded) onUploaded(j.url, j.variants);
    } catch (err: any) {
      setError(err.message || "Gagal upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="border rounded p-3 bg-slate-50">
      <div className="flex items-center gap-3">
        <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} />
        <button type="button" onClick={() => inputRef.current?.click()} className="bg-slate-700 text-white text-xs rounded px-2 py-1" disabled={uploading}>
          {uploading ? "Mengunggah..." : "Pilih File"}
        </button>
        {error && <span className="text-red-600 text-xs">{error}</span>}
      </div>
      {preview ? (
        <div className="mt-2 flex items-center gap-3">
          <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded" />
          <span className="text-xs text-slate-700">Tersimpan di: {preview}</span>
        </div>
      ) : null}
    </div>
  );
}
