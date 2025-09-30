"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeftIcon, FolderIcon } from "@heroicons/react/24/outline";
import { BASE_URL } from "@/config/api";

type PriceLike = string | number | null | undefined;

type Product = {
  id: number;
  sheet: string;
  model: string;
  description?: string | null;
  price?: number | null;
  details: Record<string, string | number>;
};

type Category = { sheet: string; count: number; products: Product[] };

type ApiResponse = { success?: boolean; data: Product[] };

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const parseRupiahLoose = (v: PriceLike): number | null => {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (!s) return null;
  s = s.replace(/(rp|idr|\s)/gi, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    const noDot = s.replace(/\./g, "");
    const intOnly = noDot.replace(/,\d+$/, "");
    const n = Number(intOnly);
    return Number.isFinite(n) ? n : null;
  }
  if (/^\d+(,\d+)?$/.test(s)) {
    const f = parseFloat(s.replace(",", "."));
    return Number.isFinite(f) ? Math.round(f) : null;
  }
  if (/^\d+(\.\d+)?$/.test(s)) {
    const f = parseFloat(s);
    return Number.isFinite(f) ? Math.round(f) : null;
  }
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const clipped = digits.length > 12 ? digits.slice(0, 12) : digits;
  const n = Number(clipped);
  return Number.isFinite(n) ? n : null;
};

const PRICE_KEYS = [
  "price list (idr) to dpp",
  "price list (idr) msrp",
  "partner price",
  "bottom price",
  "msrp",
  "dpp",
  "price",
];
const isPriceKey = (k: string) => PRICE_KEYS.includes(k.toLowerCase().trim());
const formatKey = (k: string) =>
  k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const pickMainPrice = (p: Product): number | null => {
  const d = p.details || {};
  const dpp = (d["Price List (IDR) to DPP"] ??
    d["Price List (IDR) To DPP"] ??
    d["DPP"]) as PriceLike;
  const nDpp = parseRupiahLoose(dpp);
  if (nDpp) return nDpp;
  if (typeof p.price === "number" && p.price > 0) return p.price;
  const msrp = (d["Price List (IDR) MSRP"] ??
    d["MSRP"] ??
    d["Price (MSRP)"] ??
    d["Price"]) as PriceLike;
  const nMsrp = parseRupiahLoose(msrp);
  if (nMsrp) return nMsrp;
  const partner = parseRupiahLoose(d["Partner Price"] as PriceLike);
  if (partner) return partner;
  const bottom = parseRupiahLoose(d["Bottom Price"] as PriceLike);
  if (bottom) return bottom;
  return null;
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalProducts = useMemo(
    () => categories.reduce((s, c) => s + c.count, 0),
    [categories]
  );

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${BASE_URL}/products/read?page=1&per_page=10000`);
      if (!r.ok) throw new Error(String(r.status));
      const data: ApiResponse = await r.json();
      if (!data.success || !Array.isArray(data.data))
        throw new Error("bad payload");
      const normalized: Product[] = data.data.map((p) => ({
        ...p,
        details:
          typeof p.details === "string"
            ? JSON.parse(p.details || "{}")
            : p.details,
      }));
      const map = new Map<string, Product[]>();
      for (const p of normalized) {
        const arr = map.get(p.sheet) ?? [];
        arr.push(p);
        map.set(p.sheet, arr);
      }
      const arr: Category[] = Array.from(map.entries())
        .map(([sheet, products]) => ({
          sheet,
          count: products.length,
          products: products.sort((a, b) => a.model.localeCompare(b.model)),
        }))
        .sort((a, b) => a.sheet.localeCompare(b.sheet));
      setCategories(arr);
    } catch {
      setError("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <button
            onClick={fetchCategories}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Product Categories
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {categories.length} categories • {totalProducts} total products
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((c) => (
              <button
                key={c.sheet}
                onClick={() => setSelectedCategory(c)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-left overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-md bg-gray-100">
                        <FolderIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{c.sheet}</h3>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {c.count}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1">
                    {c.products.slice(0, 3).map((p) => (
                      <div
                        key={p.id}
                        className="text-xs text-gray-500 truncate"
                      >
                        • {p.model}
                      </div>
                    ))}
                    {c.count > 3 && (
                      <div className="text-xs text-gray-400">
                        …and {c.count - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-3 text-sm"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Back to Categories
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            {selectedCategory.sheet}
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            {selectedCategory.count} product
            {selectedCategory.count !== 1 ? "s" : ""} in this category
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {selectedCategory.products.map((p) => {
            const mainPrice = pickMainPrice(p);
            return (
              <div
                key={p.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
              >
                <div className="p-4 flex-grow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                      {p.sheet}
                    </span>
                    {mainPrice !== null && (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        {formatRupiah(mainPrice)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {p.model || "Unnamed Product"}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <div className="space-y-2 mb-4">
                    {Object.entries(p.details || {})
                      .filter(([k]) => !isPriceKey(k))
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between text-sm gap-3"
                        >
                          <span className="text-gray-500">{formatKey(k)}</span>
                          <span className="font-medium text-gray-800 text-right">
                            {String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                  <button
                    onClick={() => setSelectedProduct(p)}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {selectedProduct.model || "Unnamed Product"}
                  </h2>
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                    {selectedProduct.sheet}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              {(() => {
                const main = pickMainPrice(selectedProduct);
                return main !== null ? (
                  <p className="text-green-700 font-semibold mb-4">
                    {formatRupiah(main)}
                  </p>
                ) : null;
              })()}
              {selectedProduct.description && (
                <p className="text-gray-700 mb-4">
                  {selectedProduct.description}
                </p>
              )}
              <div className="space-y-3">
                {Object.entries(selectedProduct.details || {}).map(([k, v]) => {
                  const n = isPriceKey(k)
                    ? parseRupiahLoose(v as PriceLike)
                    : null;
                  return (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-gray-600">{formatKey(k)}</span>
                      <span
                        className={`font-medium text-right ${
                          n ? "text-green-700" : "text-gray-800"
                        }`}
                      >
                        {n ? formatRupiah(n) : String(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
