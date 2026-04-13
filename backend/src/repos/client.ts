import axios from "axios";
import { config } from "../config";

function baseUrl() {
  if (!config.supabaseUrl) throw new Error("SUPABASE_URL not configured");
  return `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1`;
}

function headers() {
  if (!config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  }
  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function withFilters(params: Record<string, any>, filters?: Record<string, any>) {
  const out = { ...params } as Record<string, any>;
  if (!filters) return out;
  for (const [k, v] of Object.entries(filters)) {
    out[k] = `eq.${v}`;
  }
  return out;
}

export async function selectRows(table: string, filters?: Record<string, any>) {
  const response = await axios.get(`${baseUrl()}/${table}`, {
    headers: headers(),
    params: withFilters({ select: "*" }, filters),
  });
  return response.data || [];
}

export async function upsertRows(table: string, rows: any[], conflict = "id") {
  if (!rows.length) return;
  await axios.post(`${baseUrl()}/${table}`, rows, {
    headers: {
      ...headers(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    params: { on_conflict: conflict },
  });
}

export async function insertRow(table: string, row: any) {
  const response = await axios.post(`${baseUrl()}/${table}`, row, {
    headers: { ...headers(), Prefer: "return=representation" },
  });
  return (response.data || [])[0] || null;
}

export async function updateRows(
  table: string,
  patch: any,
  filters: Record<string, any>
) {
  const response = await axios.patch(`${baseUrl()}/${table}`, patch, {
    headers: { ...headers(), Prefer: "return=representation" },
    params: withFilters({}, filters),
  });
  return response.data || [];
}

export async function deleteRows(table: string, filters: Record<string, any>) {
  await axios.delete(`${baseUrl()}/${table}`, {
    headers: headers(),
    params: withFilters({}, filters),
  });
}

type QueryResult = Promise<{ data: any; error: { message: string } | null }>;

function unsupported(): QueryResult {
  return Promise.resolve({
    data: null,
    error: {
      message:
        "Legacy supabase query builder is not enabled in this REST-based client.",
    },
  });
}

function qb() {
  const b: any = {};
  b.select = () => b;
  b.order = () => b;
  b.eq = () => b;
  b.ilike = () => b;
  b.insert = () => b;
  b.update = () => b;
  b.delete = () => b;
  b.single = unsupported;
  b.maybeSingle = unsupported;
  b.then = (...args: any[]) => unsupported().then(...args);
  return b;
}

export const supabase = {
  from: (_table: string) => qb(),
};
