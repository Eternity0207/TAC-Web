import { supabase } from "./client";

export interface TagRow {
  id: string;
  name: string;
  slug: string;
  type: "SECTION" | "PRODUCT";
  display_order: number;
  product_slugs: string;
  created_at: string;
  updated_at: string;
}

function toTag(row: TagRow) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    displayOrder: row.display_order,
    productSlugs: row.product_slugs || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllTags() {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => toTag(row as TagRow));
}

export async function createTag(data: any) {
  const payload = {
    name: data.name,
    slug: data.slug || String(data.name || "").toLowerCase().replace(/\s+/g, "-"),
    type: data.type || "SECTION",
    display_order: Number(data.displayOrder || 0),
    product_slugs: data.productSlugs || "",
  };
  const { data: created, error } = await supabase
    .from("tags")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toTag(created as TagRow);
}

export async function updateTag(id: string, updates: any) {
  const payload: any = {};
  if (typeof updates.name !== "undefined") payload.name = updates.name;
  if (typeof updates.slug !== "undefined") payload.slug = updates.slug;
  if (typeof updates.type !== "undefined") payload.type = updates.type;
  if (typeof updates.displayOrder !== "undefined") {
    payload.display_order = Number(updates.displayOrder);
  }
  if (typeof updates.productSlugs !== "undefined") {
    payload.product_slugs = updates.productSlugs;
  }

  const { data, error } = await supabase
    .from("tags")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return toTag(data as TagRow);
}

export async function deleteTag(id: string) {
  const { error } = await supabase.from("tags").delete().eq("id", id);
  return !error;
}

export async function getProductsBySection() {
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("*")
    .eq("type", "SECTION")
    .order("display_order", { ascending: true });
  if (tagsError) throw new Error(tagsError.message);

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (productsError) throw new Error(productsError.message);

  const productList = products || [];
  return (tags || []).map((tag: any) => {
    const slugs = String(tag.product_slugs || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      type: tag.type,
      displayOrder: tag.display_order,
      productSlugs: tag.product_slugs,
      createdAt: tag.created_at,
      updatedAt: tag.updated_at,
      products: productList.filter((p: any) => slugs.includes(p.slug)),
    };
  });
}
