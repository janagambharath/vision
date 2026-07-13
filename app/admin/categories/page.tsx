import Link from "next/link";
import { Plus, Edit, Trash2, FolderTree, Save } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = { title: "Categories | Admin" };

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      parent: true,
      children: { orderBy: { sortOrder: "asc" } },
      _count: { select: { products: true } }
    }
  });

  const rootCategories = categories.filter(c => !c.parentId);
  const allForParentSelect = categories.map(c => ({ id: c.id, slug: c.slug, name: c.name }));

  async function createCategory(formData: FormData) {
    "use server";
    await requireAdmin();

    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const description = String(formData.get("description") ?? "").trim() || null;
    const parentId = String(formData.get("parentId") ?? "").trim() || null;
    const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
    const bannerUrl = String(formData.get("bannerUrl") ?? "").trim() || null;
    const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
    const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;
    const featured = formData.get("featured") === "on";
    const sortOrder = Number(formData.get("sortOrder") ?? 0);

    if (!name) {
      redirect("/admin/categories?error=name-required");
    }

    await prisma.category.create({
      data: { slug, name, description, parentId, imageUrl, bannerUrl, seoTitle, seoDescription, featured, sortOrder }
    });

    await prisma.activityLog.create({
      data: { action: "CATEGORY_CREATED", entityType: "category", metadata: { slug, name } }
    });

    revalidatePath("/admin/categories");
    redirect("/admin/categories");
  }

  async function updateCategory(formData: FormData) {
    "use server";
    await requireAdmin();

    const id = String(formData.get("id")).trim();
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const parentId = String(formData.get("parentId") ?? "").trim() || null;
    const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
    const bannerUrl = String(formData.get("bannerUrl") ?? "").trim() || null;
    const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
    const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;
    const featured = formData.get("featured") === "on";
    const sortOrder = Number(formData.get("sortOrder") ?? 0);

    await prisma.category.update({
      where: { id },
      data: { name, slug, description, parentId: parentId || null, imageUrl, bannerUrl, seoTitle, seoDescription, featured, sortOrder }
    });

    revalidatePath("/admin/categories");
    redirect("/admin/categories");
  }

  async function deleteCategory(formData: FormData) {
    "use server";
    await requireAdmin();

    const id = String(formData.get("id")).trim();

    // Check for child categories
    const childCount = await prisma.category.count({ where: { parentId: id } });
    if (childCount > 0) {
      redirect("/admin/categories?error=has-children");
    }

    // Remove product associations first
    await prisma.productCategory.deleteMany({ where: { categoryId: id } });
    await prisma.category.delete({ where: { id } });

    revalidatePath("/admin/categories");
    redirect("/admin/categories");
  }

  return (
    <main className="vv-section">
      <div className="vv-container max-w-5xl">
        <div className="mb-6">
          <p className="vv-kicker text-retail">Admin</p>
          <h1 className="text-4xl font-extrabold flex items-center gap-3">
            <FolderTree className="h-8 w-8 text-teal-600" />
            Category Management
          </h1>
          <p className="mt-1 text-slate-600">{categories.length} categories</p>
        </div>

        {/* Create New Category */}
        <details className="vv-card mb-6 group">
          <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-extrabold text-teal-700 hover:text-teal-900">
            <Plus className="h-4 w-4" />
            Add New Category
          </summary>
          <form action={createCategory} className="border-t border-slate-100 p-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Category Name *
                <input className="store-input" type="text" name="name" required placeholder="e.g. Premium" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Slug
                <input className="store-input" type="text" name="slug" placeholder="Auto-generated from name" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Parent Category
                <select className="store-input" name="parentId">
                  <option value="">None (Root category)</option>
                  {allForParentSelect.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Sort Order
                <input className="store-input" type="number" name="sortOrder" defaultValue={0} />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Description
              <textarea className="store-input min-h-16 py-2" name="description" placeholder="Category description..." />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Image URL
                <input className="store-input" type="text" name="imageUrl" placeholder="Category image URL" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Banner URL
                <input className="store-input" type="text" name="bannerUrl" placeholder="Banner image URL" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                SEO Title
                <input className="store-input" type="text" name="seoTitle" placeholder="SEO page title" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                SEO Description
                <input className="store-input" type="text" name="seoDescription" placeholder="SEO meta description" />
              </label>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" name="featured" className="rounded border-slate-300 text-teal-600 h-4 w-4" />
                Featured Category
              </label>
              <button className="vv-button-retail inline-flex items-center gap-2" type="submit">
                <Save className="h-4 w-4" /> Create Category
              </button>
            </div>
          </form>
        </details>

        {/* Category List */}
        <div className="grid gap-2">
          {rootCategories.map((category) => (
            <div key={category.id}>
              <CategoryRow category={category} allCategories={allForParentSelect} updateAction={updateCategory} deleteAction={deleteCategory} depth={0} />
              {category.children.map((child) => {
                const childWithCount = categories.find(c => c.id === child.id);
                return (
                  <CategoryRow
                    key={child.id}
                    category={{ ...child, _count: childWithCount?._count ?? { products: 0 } }}
                    allCategories={allForParentSelect}
                    updateAction={updateCategory}
                    deleteAction={deleteCategory}
                    depth={1}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

type CategoryRowProps = {
  category: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    featured: boolean;
    sortOrder: number;
    parentId?: string | null;
    imageUrl?: string | null;
    bannerUrl?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    _count: { products: number };
  };
  allCategories: { id: string; slug: string; name: string }[];
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  depth: number;
};

function CategoryRow({ category, allCategories, updateAction, deleteAction, depth }: CategoryRowProps) {
  return (
    <details className="vv-card group">
      <summary className="flex cursor-pointer items-center justify-between p-3 hover:bg-slate-50 transition rounded-xl"
        style={{ paddingLeft: `${(depth * 24) + 12}px` }}>
        <div className="flex items-center gap-3">
          {depth > 0 && <span className="text-slate-300">└─</span>}
          <div>
            <span className="font-extrabold text-slate-900">{category.name}</span>
            <span className="ml-2 text-xs text-slate-400">/{category.slug}</span>
            {category.featured && (
              <span className="ml-2 text-xs font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">Featured</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500">{category._count.products} products</span>
          <Edit className="h-4 w-4 text-slate-400" />
        </div>
      </summary>

      <div className="border-t border-slate-100 p-4">
        <form action={updateAction} className="grid gap-3">
          <input type="hidden" name="id" value={category.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">
              Name <input className="store-input text-sm" name="name" defaultValue={category.name} />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">
              Slug <input className="store-input text-sm" name="slug" defaultValue={category.slug} />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">
              Parent
              <select className="store-input text-sm" name="parentId" defaultValue={category.parentId ?? ""}>
                <option value="">None (Root)</option>
                {allCategories.filter(c => c.id !== category.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-xs font-extrabold text-slate-600">
            Description <textarea className="store-input text-sm min-h-12 py-1" name="description" defaultValue={category.description ?? ""} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">
              Image URL <input className="store-input text-sm" name="imageUrl" defaultValue={category.imageUrl ?? ""} />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">
              Banner URL <input className="store-input text-sm" name="bannerUrl" defaultValue={category.bannerUrl ?? ""} />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">
              SEO Title <input className="store-input text-sm" name="seoTitle" defaultValue={category.seoTitle ?? ""} />
            </label>
            <label className="grid gap-1 text-xs font-extrabold text-slate-600">
              SEO Description <input className="store-input text-sm" name="seoDescription" defaultValue={category.seoDescription ?? ""} />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="grid gap-1 text-xs font-extrabold text-slate-600 w-20">
              Order <input className="store-input text-sm" type="number" name="sortOrder" defaultValue={category.sortOrder} />
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input type="checkbox" name="featured" defaultChecked={category.featured} className="rounded border-slate-300 text-teal-600 h-3.5 w-3.5" />
              Featured
            </label>
            <div className="ml-auto flex gap-2">
              <button className="vv-button-retail text-xs px-3 py-1.5 inline-flex items-center gap-1" type="submit">
                <Save className="h-3.5 w-3.5" /> Update
              </button>
            </div>
          </div>
        </form>
        <form action={deleteAction} className="mt-2 border-t border-slate-100 pt-2">
          <input type="hidden" name="id" value={category.id} />
          <button className="inline-flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-600 transition" type="submit">
            <Trash2 className="h-3.5 w-3.5" /> Delete Category
          </button>
        </form>
      </div>
    </details>
  );
}
