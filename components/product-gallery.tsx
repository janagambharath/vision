import Image from "next/image";
import type { StoreProduct } from "@/lib/inventory";

export function ProductGallery({ product }: { product: StoreProduct }) {
  return (
    <div className="grid gap-3">
      <div className="vv-card relative aspect-[16/10] overflow-hidden bg-slate-50">
        {product.images[0] ? <Image src={product.images[0].url} alt={product.images[0].alt} fill priority sizes="(max-width: 900px) 100vw, 55vw" className="object-contain p-8" /> : null}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {product.images.slice(1).map((image) => (
          <div key={`${image.url}-${image.role}`} className="vv-card relative aspect-[4/3] overflow-hidden bg-slate-50">
            <Image src={image.url} alt={image.alt} fill sizes="180px" className="object-contain p-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
