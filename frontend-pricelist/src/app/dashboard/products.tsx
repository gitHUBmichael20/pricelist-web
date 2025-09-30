"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { BASE_URL } from "@/config/api";

type Details = Record<string, unknown>;

type Product = {
  id: number;
  sheet: string;
  model: string;
  description?: string | null;
  price?: number | null;
  details: Details;
};

type PaginationInfo = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  has_more_pages: boolean;
};

type ApiResponse = {
  success?: boolean;
  data: Product[];
  pagination: PaginationInfo;
};

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const parseRupiahLoose = (
  v: string | number | null | undefined
): number | null => {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v !== "string") return null;
  let s = v.trim().replace(/(rp|idr|\s)/gi, "");
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s))
    s = s.replace(/\./g, "").replace(/,\d+$/, "");
  else if (/^\d+(,\d+)?$/.test(s)) s = s.replace(",", ".");
  else if (!/^\d+(\.\d+)?$/.test(s)) s = s.replace(/[^\d]/g, "");
  if (!s) return null;
  if (s.length > 12) s = s.slice(0, 12);
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const PRICE_KEYS = new Set([
  "price list (idr) to dpp",
  "price list (idr) msrp",
  "partner price",
  "bottom price",
  "msrp",
  "dpp",
  "price",
]);

const isPriceKey = (k: string) => PRICE_KEYS.has(k.toLowerCase().trim());

const getDetail = (d: Details, key: string): string | number | null => {
  const v = d?.[key];
  return typeof v === "string" || typeof v === "number" ? v : null;
};

const pickMainPrice = (p: Product): number | null => {
  const d = p.details || {};
  for (const k of [
    "Price List (IDR) to DPP",
    "Price List (IDR) To DPP",
    "DPP",
  ]) {
    const n = parseRupiahLoose(getDetail(d, k));
    if (n) return n;
  }
  if (typeof p.price === "number" && p.price > 0) return p.price;
  for (const k of [
    "Price List (IDR) MSRP",
    "MSRP",
    "Price (MSRP)",
    "Price",
    "Partner Price",
    "Bottom Price",
  ]) {
    const n = parseRupiahLoose(getDetail(d, k));
    if (n) return n;
  }
  return null;
};

const coerceDetails = (val: unknown): Details =>
  val && typeof val === "object" && !Array.isArray(val) ? (val as Details) : {};
const safeString = (v: unknown): string =>
  typeof v === "string" || typeof v === "number"
    ? String(v)
    : JSON.stringify(v ?? "");

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
    has_more_pages: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchProducts = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const isSearch = !!debouncedSearch;
        const params = new URLSearchParams({
          page: String(page),
          per_page: "20",
          ...(isSearch ? { q: debouncedSearch } : {}),
        });
        const url = `${BASE_URL}/products/${
          isSearch ? "search" : "read"
        }?${params}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ApiResponse = await res.json();
        if (!data.success || !Array.isArray(data.data))
          throw new Error("Invalid payload");
        const normalized = data.data.map((p) => ({
          ...p,
          details: coerceDetails(
            typeof p.details === "string"
              ? JSON.parse(p.details || "{}")
              : p.details
          ),
        }));
        setProducts(normalized);
        setPagination(data.pagination);
      } catch {
        setError("Failed to fetch products");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch]
  );

  useEffect(() => {
    fetchProducts(pagination.current_page);
  }, [pagination.current_page, fetchProducts]);

  useEffect(() => {
    setPagination((p) => ({ ...p, current_page: 1 }));
  }, [debouncedSearch]);

  const handlePageChange = (page: number) =>
    page >= 1 &&
    page <= pagination.last_page &&
    setPagination((p) => ({ ...p, current_page: page }));

  const pages = useMemo<(number | "...")[]>(() => {
    const { current_page: c, last_page: L } = pagination;
    if (L <= 5) return Array.from({ length: L }, (_, i) => i + 1);
    if (c <= 3) return [1, 2, 3, "...", L];
    if (c >= L - 2) return [1, "...", L - 2, L - 1, L];
    return [1, "...", c - 1, c, c + 1, "...", L];
  }, [pagination]);

  const headerStats = useMemo(
    () => ({
      total: pagination.total,
      from: pagination.from,
      to: pagination.to,
    }),
    [pagination]
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <button
            onClick={() => fetchProducts(1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Product Catalog
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-4 py-2 border border-blue-500 rounded-lg text-sm text-blue-700 focus:ring-blue-500 focus:border-blue-500"
              type="text"
            />
            <div className="text-sm text-gray-600">
              {headerStats.total} total items • Showing {headerStats.from}-{" "}
              {headerStats.to}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => {
            const mainPrice = pickMainPrice(p);
            const nonPrice = Object.entries(p.details || {})
              .filter(([k]) => !isPriceKey(k))
              .slice(0, 2); // Limit number of details shown initially

            return (
              <div
                key={p.id}
                className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
              >
                <div className="p-4 flex-grow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                      {p.sheet}
                    </span>
                    {mainPrice != null && (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        {formatRupiah(mainPrice)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {p.model || "Unnamed Product"}
                  </h3>
                  {p.description && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                      {p.description}
                    </p>
                  )}
                  <div className="space-y-2 mb-4">
                    {nonPrice.map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between text-sm gap-3"
                      >
                        <span className="text-gray-500">{k}</span>
                        <span className="font-medium text-gray-800 text-right">
                          {safeString(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProduct(p)}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-b-lg hover:bg-blue-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            );
          })}
        </main>

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <footer className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.current_page - 1)}
                disabled={pagination.current_page === 1}
                className={`px-3 py-2 rounded-md text-sm ${
                  pagination.current_page === 1
                    ? "text-gray-400"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
                aria-label="Previous page"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {pages.map((pg, i) => (
                <button
                  key={i}
                  onClick={() => typeof pg === "number" && handlePageChange(pg)}
                  className={`px-3 py-2 rounded-md text-sm ${
                    pg === pagination.current_page
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 hover:bg-gray-200"
                  }`}
                  disabled={pg === "..."}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(pagination.current_page + 1)}
                disabled={pagination.current_page === pagination.last_page}
                className={`px-3 py-2 rounded-md text-sm ${
                  pagination.current_page === pagination.last_page
                    ? "text-gray-400"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
                aria-label="Next page"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </nav>
          </footer>
        )}
      </div>

      {/* Modal */}
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
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedProduct.model || "Unnamed Product"}
                </h2>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close modal"
                  onClick={() => setSelectedProduct(null)}
                >
                  ✕
                </button>
              </div>
              {(() => {
                const n = pickMainPrice(selectedProduct);
                return n != null ? (
                  <p className="text-green-700 font-semibold mb-4">
                    {formatRupiah(n)}
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
                    ? parseRupiahLoose(getDetail(selectedProduct.details, k))
                    : null;
                  return (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-gray-600">{k}</span>
                      <span
                        className={`font-medium text-right ${
                          n ? "text-green-700" : "text-gray-800"
                        }`}
                      >
                        {n ? formatRupiah(n) : safeString(v)}
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
