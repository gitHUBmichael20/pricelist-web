"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BASE_URL } from "@/config/api";

/** -----------------------------
 * Types
 * ----------------------------- */
type Details = Record<string, string | number>;

type Product = {
  id: number;
  sheet: string;
  model: string;
  description?: string | null;
  details: Details;
};

type ApiProduct = Omit<Product, "details"> & { details: unknown };

/** -----------------------------
 * Helpers
 * ----------------------------- */

// Case-insensitive match for any key containing "dpp"
const HIDDEN_DETAIL_KEY = /\bdpp\b/i;

// Minimal type guard for details
const isDetails = (x: unknown): x is Details =>
  !!x &&
  typeof x === "object" &&
  Object.entries(x as Record<string, unknown>).every(
    ([, v]) => typeof v === "string" || typeof v === "number"
  );

// Sanitize an object by:
// - Removing any keys that look like DPP (e.g., "DPP", "Price List (IDR) to DPP")
// - Keeping only string/number values
const sanitizeDetails = (x: unknown): Details => {
  if (!x || typeof x !== "object") return {};
  const out: Details = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (HIDDEN_DETAIL_KEY.test(k)) continue; // hide DPP-related keys
    if (typeof v === "string" || typeof v === "number") {
      out[k] = v;
    } else if (v != null) {
      // Coerce other primitives to string if needed
      out[k] = String(v);
    }
  }
  return out;
};

// Safe parse that also sanitizes (removes DPP keys)
const safeParseDetails = (input: unknown): Details => {
  if (typeof input === "string") {
    try {
      const parsed: unknown = JSON.parse(input || "{}");
      return sanitizeDetails(parsed);
    } catch {
      return {};
    }
  }
  return sanitizeDetails(input);
};

// type-safe AbortError checker
const isAbortError = (err: unknown): boolean => {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name === "AbortError";
  }
  return err instanceof Error && err.name === "AbortError";
};

// Pretty field labels
const formatKey = (key: string) =>
  key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

/** -----------------------------
 * Component
 * ----------------------------- */
export default function ListProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // init: baca sheet_access dari sessionStorage
  useEffect(() => {
    const access = sessionStorage.getItem("sheet_access") || "";
    const list = access
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    setSheets(list);

    const url = new URL(window.location.href);
    const urlSheet = url.searchParams.get("sheet");
    const initial =
      urlSheet && list.includes(urlSheet) ? urlSheet : list[0] || "";
    setSelectedSheet(initial);

    if (!access) {
      setError("No sheet access found for this user");
      setLoading(false);
    }
  }, []);

  // fetch products tiap kali sheet berubah
  useEffect(() => {
    const run = async () => {
      if (!selectedSheet) return;
      setLoading(true);
      setError(null);

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = sessionStorage.getItem("token") || "";
        const res = await fetch(
          `${BASE_URL}/api/products/read?sheet=${encodeURIComponent(
            selectedSheet
          )}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        const normalized: Product[] = Array.isArray(data?.data)
          ? data.data.map((p: ApiProduct) => ({
              ...p,
              details: safeParseDetails(p.details), // ← sanitize here so DPP never shows up
            }))
          : [];

        setProducts(normalized);
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        console.error("Fetch error:", err);
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => {
      abortRef.current?.abort();
    };
  }, [selectedSheet]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.model.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
    );
  }, [products, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between px-4 sm:px-6 lg:px-8 pt-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Product Catalog
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            {filteredProducts.length} products found
            {selectedSheet ? ` in “${selectedSheet}”` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sheet:</label>
          <select
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white text-gray-900"
            value={selectedSheet}
            onChange={(e) => setSelectedSheet(e.target.value)}
            disabled={loading || sheets.length === 0}
          >
            {sheets.length === 0 && <option value="">No Access</option>}
            {sheets.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 px-4 sm:px-6 lg:px-8">
        <input
          type="text"
          placeholder="Search products..."
          className="w-full sm:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-100 text-gray-900 placeholder-gray-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center text-red-600 py-10">{error}</div>
      )}

      {/* Empty */}
      {!loading && !error && filteredProducts.length === 0 && (
        <p className="text-gray-500 text-center">
          No products match your search.
        </p>
      )}

      {/* Grid */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="p-4 flex flex-col flex-grow">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {product.sheet}
                  </span>
                  <span className="text-xs text-gray-400">#{product.id}</span>
                </div>

                <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 line-clamp-2">
                  {product.model || "Unnamed Product"}
                </h3>

                {product.description && (
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Top 2 non-DPP details already sanitized at parse-time */}
                <div className="space-y-1 mb-4 flex-grow">
                  {Object.entries(product.details)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center text-xs"
                      >
                        <span className="text-gray-500">{formatKey(key)}</span>
                        <span className="text-gray-800 ml-2">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => setSelectedProduct(product)}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors mt-auto"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedProduct.model}
                </h3>
                <p className="text-sm text-blue-600">{selectedProduct.sheet}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {selectedProduct.description && (
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">
                    Description
                  </h4>
                  <p className="text-gray-700 text-sm">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {Object.keys(selectedProduct.details).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">
                    Specifications
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(selectedProduct.details).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="bg-gray-50 p-2 rounded-md text-sm"
                        >
                          <p className="text-gray-500">{formatKey(key)}</p>
                          <p className="font-semibold text-gray-800">
                            {String(value)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
