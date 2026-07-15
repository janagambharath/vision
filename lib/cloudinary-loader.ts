'use client'

export default function cloudinaryLoader({ src, width, quality }: { src: string, width: number, quality?: number }) {
  if (!src.includes('res.cloudinary.com')) return src;
  
  const parts = src.split('/upload/');
  if (parts.length !== 2) return src;
  
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`];
  return `${parts[0]}/upload/${params.join(',')}/${parts[1]}`;
}
