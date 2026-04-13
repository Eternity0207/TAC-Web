import { supabase } from "./client";

function toReview(row: any) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    rating: row.rating,
    reviewText: row.review_text,
    productName: row.product_name,
    city: row.city,
    photoUrl: row.photo_url,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
  };
}

export async function submitReview(data: any) {
  const { data: created, error } = await supabase
    .from("reviews")
    .insert({
      customer_name: data.customerName,
      customer_email: data.customerEmail || "",
      customer_phone: data.customerPhone || "",
      rating: Number(data.rating || 0),
      review_text: data.reviewText,
      product_name: data.productName || "",
      city: data.city || "",
      photo_url: data.photoUrl || "",
      status: "PENDING",
    })
    .select("*")
    .single();

  if (error) return { success: false, message: error.message };
  return { success: true, message: "Review submitted", data: toReview(created) };
}

export async function getApprovedReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toReview);
}

export async function getAllReviews() {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map(toReview);
}

export async function updateReviewStatus(id: string, status: "APPROVED" | "REJECTED" | "PENDING") {
  const now = new Date().toISOString();
  const payload: any = { status };
  payload.approved_at = status === "APPROVED" ? now : null;
  payload.rejected_at = status === "REJECTED" ? now : null;

  const { error } = await supabase.from("reviews").update(payload).eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Review updated" };
}

export async function deleteReview(id: string) {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true, message: "Review deleted" };
}

export async function getReviewPhoto(id: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("photo_url")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.photo_url) return null;
  return { photo: data.photo_url, mimeType: "image/jpeg" };
}
