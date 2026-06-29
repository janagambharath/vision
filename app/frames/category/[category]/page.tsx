import type { Metadata } from "next";
import FramesPage from "@/app/frames/page";

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  return {
    title: `${category.replace(/-/g, " ")} Frames`,
    description: `Browse ${category.replace(/-/g, " ")} eyewear in the Vision Vistara frames store.`
  };
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{ q?: string; sort?: string }>;
}) {
  const { category } = await params;
  const incoming = (await searchParams) ?? {};
  return FramesPage({
    searchParams: Promise.resolve({
      ...incoming,
      category
    })
  });
}
