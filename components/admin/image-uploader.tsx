"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, GripVertical, Image as ImageIcon, Loader2 } from "lucide-react";

export type UploadedImage = {
  url: string;
  alt: string;
  role: string;
  sortOrder: number;
};

const IMAGE_ROLES = [
  { value: "front", label: "Front" },
  { value: "angle", label: "45° Angle" },
  { value: "left-side", label: "Left Side" },
  { value: "right-side", label: "Right Side" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "folded", label: "Folded" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "transparent", label: "Transparent PNG" },
  { value: "thumbnail", label: "Thumbnail" },
  { value: "hover", label: "Hover" },
  { value: "zoom", label: "Zoom" },
  { value: "gallery", label: "Gallery" },
  { value: "ar", label: "AR Asset" },
];

type Props = {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  productName?: string;
};

export function ImageUploader({ images, onChange, productName = "Product" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    const newImages: UploadedImage[] = [];

    for (const file of Array.from(files)) {
      // Validate type
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Only JPEG, PNG, WebP allowed.`);
        continue;
      }
      // Validate size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`File too large: ${file.name}. Max 10MB.`);
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const err = await res.json();
          alert(`Upload failed: ${err.error || "Unknown error"}`);
          continue;
        }
        const data = await res.json();
        newImages.push({
          url: data.url,
          alt: `${productName} ${file.name.replace(/\.[^.]+$/, "")}`,
          role: images.length === 0 && newImages.length === 0 ? "front" : "gallery",
          sortOrder: images.length + newImages.length,
        });
      } catch (err) {
        console.error("Upload error:", err);
        alert(`Upload failed for ${file.name}`);
      }
    }

    onChange([...images, ...newImages]);
    setUploading(false);
  }, [images, onChange, productName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index).map((img, i) => ({ ...img, sortOrder: i }));
    onChange(updated);
  };

  const updateImageRole = (index: number, role: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index], role };
    onChange(updated);
  };

  const updateImageAlt = (index: number, alt: string) => {
    const updated = [...images];
    updated[index] = { ...updated[index], alt };
    onChange(updated);
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const updated = [...images];
    const [removed] = updated.splice(dragIndex, 1);
    updated.splice(index, 0, removed);
    const reordered = updated.map((img, i) => ({ ...img, sortOrder: i }));
    onChange(reordered);
    setDragIndex(index);
  };

  return (
    <div className="grid gap-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all duration-200 sm:p-8 ${
          dragOver
            ? "border-teal-500 bg-teal-50"
            : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
            <span className="text-sm font-bold text-teal-700">Uploading to Cloudinary...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-slate-400" />
            <span className="text-sm font-bold text-slate-600">
              Drag & drop images here or click to browse
            </span>
            <span className="text-xs text-slate-400">
              JPEG, PNG, WebP • Max 10MB each • Multiple files allowed
            </span>
          </div>
        )}
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid gap-3">
          <h3 className="text-sm font-extrabold text-slate-700 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-teal-600" />
            {images.length} image{images.length !== 1 ? "s" : ""} • Drag to reorder
          </h3>
          <div className="grid gap-2">
            {images.map((image, index) => (
              <div
                key={`${image.url}-${index}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={() => setDragIndex(null)}
                className={`grid grid-cols-[auto_64px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-white p-2 transition-shadow sm:grid-cols-[auto_80px_minmax(0,1fr)_140px_auto] sm:gap-3 ${
                  dragIndex === index ? "shadow-lg ring-2 ring-teal-300" : "shadow-sm hover:shadow-md"
                }`}
              >
                <GripVertical className="h-4 w-4 text-slate-300 cursor-grab active:cursor-grabbing" />

                {/* Thumbnail */}
                <div className="flex h-12 w-16 items-center justify-center overflow-hidden rounded-md border border-slate-100 bg-slate-50 sm:h-14 sm:w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>

                {/* Alt text */}
                <input
                  type="text"
                  value={image.alt}
                  onChange={(e) => updateImageAlt(index, e.target.value)}
                  className="store-input min-w-0 py-1.5 text-xs"
                  placeholder="Alt text..."
                />

                {/* Role selector */}
                <select
                  value={image.role}
                  onChange={(e) => updateImageRole(index, e.target.value)}
                  className="col-start-2 col-span-2 store-input py-1.5 text-xs sm:col-auto sm:col-span-1"
                >
                  {IMAGE_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden inputs for form submission */}
      {images.map((image, index) => (
        <div key={`hidden-${index}`}>
          <input type="hidden" name={`image_url_${index}`} value={image.url} />
          <input type="hidden" name={`image_alt_${index}`} value={image.alt} />
          <input type="hidden" name={`image_role_${index}`} value={image.role} />
          <input type="hidden" name={`image_sort_${index}`} value={image.sortOrder} />
        </div>
      ))}
      <input type="hidden" name="image_count" value={images.length} />
    </div>
  );
}
