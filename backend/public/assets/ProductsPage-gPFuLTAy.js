import { r as a, aK as c, z as o, j as e } from "./index-BPJlMmjo.js";

const baseVariant = { weight: "", price: 0, mrp: 0, stock: 0, stockStatus: "IN_STOCK" };
const f = {
  name: "",
  shortDescription: "",
  description: "",
  imageUrl: "",
  category: "",
  isFeatured: false,
  isActive: true,
  displayOrder: 0,
  stock: 0,
  stockStatus: "IN_STOCK",
  variants: [{ ...baseVariant }],
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeVariant(v) {
  const stock = Math.max(0, toNumber(v?.stock ?? v?.stockQuantity, 0));
  return {
    weight: String(v?.weight || ""),
    price: Math.max(0, toNumber(v?.price, 0)),
    mrp: Math.max(0, toNumber(v?.mrp, 0)),
    stock,
    stockQuantity: stock,
    stockStatus: stock <= 0 ? "OUT_OF_STOCK" : "IN_STOCK",
  };
}

function getStockBadge(stockValue, statusValue) {
  const stock = Math.max(0, toNumber(stockValue, 0));
  const status = String(statusValue || "").toUpperCase();
  if (status === "OUT_OF_STOCK" || stock <= 0) {
    return { text: "Out of stock", bg: "#fee2e2", color: "#991b1b" };
  }
  if (stock <= 10) {
    return { text: `Only ${stock} left`, bg: "#fef3c7", color: "#92400e" };
  }
  return { text: `${stock} in stock`, bg: "#dcfce7", color: "#166534" };
}

function P() {
  const [g, b] = a.useState([]);
  const [y, u] = a.useState(true);
  const [v, s] = a.useState(false);
  const [l, h] = a.useState(null);
  const [t, d] = a.useState({ ...f });

  a.useEffect(() => {
    p();
  }, []);

  async function p() {
    var r;
    try {
      u(true);
      const i = await c.getAll();
      b(((r = i.data) == null ? void 0 : r.data) || []);
    } catch {
      o.error("Failed to load products");
    } finally {
      u(false);
    }
  }

  function j() {
    h(null);
    d({ ...f, variants: [{ ...baseVariant }] });
    s(true);
  }

  function S(r) {
    const variants = Array.isArray(r.variants) && r.variants.length > 0 ? r.variants.map(normalizeVariant) : [{ ...baseVariant }];
    const totalStock = variants.reduce((sum, item) => sum + Math.max(0, toNumber(item.stock, 0)), 0);
    h(r);
    d({
      name: r.name,
      shortDescription: r.shortDescription || "",
      description: r.description || "",
      imageUrl: r.imageUrl || "",
      category: r.category || "",
      isFeatured: !!r.isFeatured,
      isActive: !!r.isActive,
      displayOrder: r.displayOrder || 0,
      stock: Math.max(0, toNumber(r.stock ?? r.stockQuantity, totalStock)),
      stockStatus: String(r.stockStatus || (totalStock <= 0 ? "OUT_OF_STOCK" : "IN_STOCK")).toUpperCase(),
      variants,
    });
    s(true);
  }

  async function z(r) {
    r.preventDefault();
    try {
      const validVariants = t.variants.filter((n) => n.weight);
      const normalizedVariants = validVariants.map(normalizeVariant);
      const totalStock = normalizedVariants.reduce((sum, item) => sum + Math.max(0, toNumber(item.stock, 0)), 0);
      const stockStatus = totalStock <= 0 ? "OUT_OF_STOCK" : "IN_STOCK";
      const i = {
        ...t,
        stock: totalStock,
        stockQuantity: totalStock,
        stockStatus,
        variants: JSON.stringify(normalizedVariants),
      };
      if (l) {
        await c.update(l.id, i);
        o.success("Product updated");
      } else {
        await c.create(i);
        o.success("Product created");
      }
      s(false);
      p();
    } catch {
      o.error("Failed to save product");
    }
  }

  async function w(r) {
    if (confirm("Delete this product?")) {
      try {
        await c.delete(r);
        o.success("Product deleted");
        p();
      } catch {
        o.error("Failed to delete");
      }
    }
  }

  function k() {
    d({ ...t, variants: [...t.variants, { ...baseVariant }] });
  }

  function C(r) {
    const i = [...t.variants];
    i.splice(r, 1);
    d({ ...t, variants: i.length > 0 ? i : [{ ...baseVariant }] });
  }

  function x(r, i, n) {
    const m = [...t.variants];
    if (i === "weight" || i === "stockStatus") {
      m[r][i] = n;
    } else {
      m[r][i] = Math.max(0, Number(n || 0));
    }
    d({ ...t, variants: m });
  }

  return y
    ? e.jsx("div", {
        className: "loading-container",
        style: { minHeight: "50vh" },
        children: e.jsx("div", { className: "spinner" }),
      })
    : e.jsxs("div", {
        children: [
          e.jsxs("div", {
            style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
            children: [
              e.jsx("h1", { style: { fontSize: "1.5rem", fontWeight: 700, margin: 0 }, children: "📦 Products Management" }),
              e.jsx("button", {
                onClick: j,
                style: {
                  padding: "10px 20px",
                  background: "var(--accent-primary, #2563eb)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                },
                children: "+ Add Product",
              }),
            ],
          }),
          e.jsx("div", {
            style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" },
            children: g.map((r) => {
              const variants = Array.isArray(r.variants) ? r.variants : [];
              const i = variants.length > 0 ? variants[0] : null;
              const totalStock =
                Math.max(0, toNumber(r.stock ?? r.stockQuantity, 0)) ||
                variants.reduce((sum, item) => sum + Math.max(0, toNumber(item?.stock ?? item?.stockQuantity, 0)), 0);
              const badge = getStockBadge(totalStock, r.stockStatus);
              return e.jsxs(
                "div",
                {
                  style: {
                    background: "var(--bg-card, white)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-color, #e5e7eb)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    overflow: "hidden",
                  },
                  children: [
                    r.imageUrl &&
                      e.jsx("div", {
                        style: { height: "160px", overflow: "hidden", background: "#f3f4f6" },
                        children: e.jsx("img", { src: r.imageUrl, alt: r.name, style: { width: "100%", height: "100%", objectFit: "cover" } }),
                      }),
                    e.jsxs("div", {
                      style: { padding: "1rem" },
                      children: [
                        e.jsxs("div", {
                          style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" },
                          children: [
                            e.jsxs("div", {
                              children: [
                                e.jsx("h3", { style: { margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 600 }, children: r.name }),
                                e.jsxs("div", {
                                  style: { display: "flex", gap: "6px", flexWrap: "wrap" },
                                  children: [
                                    r.isActive
                                      ? e.jsx("span", {
                                          style: { fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "#dcfce7", color: "#166534", fontWeight: 600 },
                                          children: "Active",
                                        })
                                      : e.jsx("span", {
                                          style: { fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "#fee2e2", color: "#991b1b", fontWeight: 600 },
                                          children: "Inactive",
                                        }),
                                    r.isFeatured &&
                                      e.jsx("span", {
                                        style: { fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: "#fef3c7", color: "#92400e", fontWeight: 600 },
                                        children: "⭐ Featured",
                                      }),
                                    e.jsx("span", {
                                      style: { fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", background: badge.bg, color: badge.color, fontWeight: 700 },
                                      children: badge.text,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            e.jsxs("div", {
                              style: { display: "flex", gap: "4px" },
                              children: [
                                e.jsx("button", {
                                  onClick: () => S(r),
                                  style: { padding: "4px 10px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem" },
                                  children: "Edit",
                                }),
                                e.jsx("button", {
                                  onClick: () => w(r.id),
                                  style: {
                                    padding: "4px 10px",
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    color: "#dc2626",
                                  },
                                  children: "Del",
                                }),
                              ],
                            }),
                          ],
                        }),
                        e.jsx("p", { style: { fontSize: "0.85rem", color: "#6b7280", margin: "0 0 8px", lineHeight: 1.4 }, children: r.shortDescription || "No description" }),
                        e.jsxs("div", {
                          style: { fontSize: "0.85rem", color: "#374151" },
                          children: [
                            i && e.jsxs("span", { style: { fontWeight: 700, color: "#c45a11" }, children: ["₹", i.price] }),
                            i && i.mrp > i.price && e.jsxs("span", { style: { marginLeft: "6px", color: "#999", textDecoration: "line-through", fontSize: "0.8rem" }, children: ["₹", i.mrp] }),
                            variants && variants.length > 1 && e.jsxs("span", { style: { marginLeft: "8px", color: "#6b7280", fontSize: "0.8rem" }, children: ["+", variants.length - 1, " more"] }),
                          ],
                        }),
                        e.jsxs("div", {
                          style: { display: "flex", gap: "8px", fontSize: "0.8rem", color: "#9ca3af", marginTop: "6px" },
                          children: [e.jsxs("span", { children: ["Slug: ", r.slug] }), e.jsx("span", { children: "•" }), e.jsxs("span", { children: ["Order: ", r.displayOrder] })],
                        }),
                      ],
                    }),
                  ],
                },
                r.id
              );
            }),
          }),
          g.length === 0 &&
            e.jsxs("div", {
              style: { textAlign: "center", padding: "3rem", color: "#9ca3af" },
              children: [
                e.jsx("p", { style: { fontSize: "1.1rem", marginBottom: "8px" }, children: "No products yet." }),
                e.jsx("p", { style: { fontSize: "0.9rem" }, children: "Add your first product to display it dynamically on the landing page." }),
              ],
            }),
          v &&
            e.jsx("div", {
              style: {
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1e3,
              },
              onClick: () => s(false),
              children: e.jsxs("div", {
                style: {
                  background: "var(--bg-card, white)",
                  borderRadius: "16px",
                  padding: "2rem",
                  width: "90%",
                  maxWidth: "760px",
                  maxHeight: "85vh",
                  overflow: "auto",
                },
                onClick: (r) => r.stopPropagation(),
                children: [
                  e.jsx("h2", { style: { margin: "0 0 1.5rem", fontSize: "1.25rem" }, children: l ? "Edit Product" : "Add Product" }),
                  e.jsxs("form", {
                    onSubmit: z,
                    children: [
                      e.jsxs("div", {
                        style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" },
                        children: [
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }, children: "Product Name *" }),
                              e.jsx("input", {
                                value: t.name,
                                onChange: (r) => d({ ...t, name: r.target.value }),
                                required: true,
                                style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
                                placeholder: "Pure Awla Powder",
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }, children: "Category" }),
                              e.jsx("input", {
                                value: t.category,
                                onChange: (r) => d({ ...t, category: r.target.value }),
                                style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
                                placeholder: "Powder, Candy, etc.",
                              }),
                            ],
                          }),
                        ],
                      }),
                      e.jsxs("div", {
                        style: { marginBottom: "12px" },
                        children: [
                          e.jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }, children: "Short Description" }),
                          e.jsx("input", {
                            value: t.shortDescription,
                            onChange: (r) => d({ ...t, shortDescription: r.target.value }),
                            style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
                            placeholder: "Brief one-liner for product cards",
                          }),
                        ],
                      }),
                      e.jsxs("div", {
                        style: { marginBottom: "12px" },
                        children: [
                          e.jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }, children: "Full Description" }),
                          e.jsx("textarea", {
                            value: t.description,
                            onChange: (r) => d({ ...t, description: r.target.value }),
                            rows: 3,
                            style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" },
                            placeholder: "Detailed product description for detail page",
                          }),
                        ],
                      }),
                      e.jsxs("div", {
                        style: { marginBottom: "12px" },
                        children: [
                          e.jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }, children: "Image URL" }),
                          e.jsx("input", {
                            value: t.imageUrl,
                            onChange: (r) => d({ ...t, imageUrl: r.target.value }),
                            style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
                            placeholder: "https://... or assets/awla-powder.jpg",
                          }),
                        ],
                      }),
                      e.jsxs("div", {
                        style: { marginBottom: "12px", padding: "10px", border: "1px solid #dbeafe", borderRadius: "8px", background: "#f8fbff" },
                        children: [
                          e.jsx("label", { style: { display: "block", fontWeight: 700, marginBottom: "6px", fontSize: "0.85rem", color: "#1d4ed8" }, children: "Manual Stock Override (Product Level)" }),
                          e.jsxs("div", {
                            style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
                            children: [
                              e.jsx("input", {
                                type: "number",
                                min: 0,
                                value: t.stock || 0,
                                onChange: (r) => d({ ...t, stock: Math.max(0, Number(r.target.value || 0)) }),
                                placeholder: "Total stock",
                                style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
                              }),
                              e.jsx("select", {
                                value: t.stockStatus || "IN_STOCK",
                                onChange: (r) => d({ ...t, stockStatus: r.target.value }),
                                style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
                                children: [
                                  e.jsx("option", { value: "IN_STOCK", children: "IN_STOCK" }),
                                  e.jsx("option", { value: "OUT_OF_STOCK", children: "OUT_OF_STOCK" }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      }),
                      e.jsxs("div", {
                        style: { marginBottom: "12px" },
                        children: [
                          e.jsxs("div", {
                            style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
                            children: [
                              e.jsx("label", { style: { fontWeight: 600, fontSize: "0.85rem" }, children: "Variants (Size, Price, Stock)" }),
                              e.jsx("button", {
                                type: "button",
                                onClick: k,
                                style: { padding: "4px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", color: "#1d4ed8" },
                                children: "+ Add Variant",
                              }),
                            ],
                          }),
                          t.variants.map((r, i) =>
                            e.jsxs(
                              "div",
                              {
                                style: { display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr auto", gap: "8px", marginBottom: "8px" },
                                children: [
                                  e.jsx("input", {
                                    value: r.weight,
                                    onChange: (n) => x(i, "weight", n.target.value),
                                    placeholder: "100gm",
                                    style: { padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem" },
                                  }),
                                  e.jsx("input", {
                                    type: "number",
                                    value: r.price || "",
                                    onChange: (n) => x(i, "price", n.target.value),
                                    placeholder: "₹ Price",
                                    style: { padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem" },
                                  }),
                                  e.jsx("input", {
                                    type: "number",
                                    value: r.mrp || "",
                                    onChange: (n) => x(i, "mrp", n.target.value),
                                    placeholder: "₹ MRP",
                                    style: { padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem" },
                                  }),
                                  e.jsx("input", {
                                    type: "number",
                                    min: 0,
                                    value: r.stock || 0,
                                    onChange: (n) => x(i, "stock", n.target.value),
                                    placeholder: "Stock",
                                    style: { padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem" },
                                  }),
                                  e.jsxs("select", {
                                    value: r.stockStatus || "IN_STOCK",
                                    onChange: (n) => x(i, "stockStatus", n.target.value),
                                    style: { padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem" },
                                    children: [
                                      e.jsx("option", { value: "IN_STOCK", children: "IN_STOCK" }),
                                      e.jsx("option", { value: "OUT_OF_STOCK", children: "OUT_OF_STOCK" }),
                                    ],
                                  }),
                                  t.variants.length > 1 &&
                                    e.jsx("button", {
                                      type: "button",
                                      onClick: () => C(i),
                                      style: {
                                        padding: "6px 10px",
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        color: "#dc2626",
                                        fontSize: "0.85rem",
                                      },
                                      children: "✕",
                                    }),
                                ],
                              },
                              i
                            )
                          ),
                        ],
                      }),
                      e.jsxs("div", {
                        style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "1.5rem" },
                        children: [
                          e.jsxs("div", {
                            children: [
                              e.jsx("label", { style: { display: "block", fontWeight: 600, marginBottom: "4px", fontSize: "0.85rem" }, children: "Display Order" }),
                              e.jsx("input", {
                                type: "number",
                                value: t.displayOrder,
                                onChange: (r) => d({ ...t, displayOrder: parseInt(r.target.value) || 0 }),
                                style: { width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.9rem", boxSizing: "border-box" },
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            style: { display: "flex", alignItems: "center", gap: "8px", paddingTop: "22px" },
                            children: [
                              e.jsx("input", { type: "checkbox", checked: t.isFeatured, onChange: (r) => d({ ...t, isFeatured: r.target.checked }), id: "featured" }),
                              e.jsx("label", { htmlFor: "featured", style: { fontSize: "0.85rem", fontWeight: 600 }, children: "⭐ Featured" }),
                            ],
                          }),
                          e.jsxs("div", {
                            style: { display: "flex", alignItems: "center", gap: "8px", paddingTop: "22px" },
                            children: [
                              e.jsx("input", { type: "checkbox", checked: t.isActive, onChange: (r) => d({ ...t, isActive: r.target.checked }), id: "active" }),
                              e.jsx("label", { htmlFor: "active", style: { fontSize: "0.85rem", fontWeight: 600 }, children: "Active" }),
                            ],
                          }),
                        ],
                      }),
                      e.jsxs("div", {
                        style: { display: "flex", gap: "10px", justifyContent: "flex-end" },
                        children: [
                          e.jsx("button", {
                            type: "button",
                            onClick: () => s(false),
                            style: { padding: "10px 20px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer" },
                            children: "Cancel",
                          }),
                          e.jsx("button", {
                            type: "submit",
                            style: {
                              padding: "10px 20px",
                              background: "var(--accent-primary, #2563eb)",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: 600,
                            },
                            children: l ? "Update" : "Create",
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            }),
        ],
      });
}

export { P as default };
