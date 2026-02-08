"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_URL } from "@/config/api";

/** ===================== Types ===================== */
type Details = Record<string, string | number>;

type Product = {
  id: number;
  sheet: string;
  model: string;
  description?: string | null;
  price?: number | null;
  details: unknown; // parsed later
  created_at?: string;
  updated_at?: string;
};

type PaginationInfo = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  has_more_pages: boolean;
};

type ApiReadResponse = {
  success?: boolean;
  data: Product[];
  pagination: PaginationInfo;
};

/** ===================== Helpers ===================== */
const isDetails = (x: unknown): x is Details =>
  !!x &&
  typeof x === "object" &&
  Object.entries(x as Record<string, unknown>).every(
    ([, v]) => typeof v === "string" || typeof v === "number"
  );

const safeParseDetails = (input: unknown): Details => {
  if (typeof input === "string") {
    try {
      const parsed: unknown = JSON.parse(input || "{}");
      return isDetails(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return isDetails(input) ? input : {};
};

const formatRupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const parseRupiahLoose = (
  value: string | number | null | undefined
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value))
    return Math.round(value);
  if (typeof value !== "string") return null;

  let s = value.trim();
  if (!s) return null;
  s = s.replace(/(rp|idr|\s)/gi, "");
  const dotThousands = /^\d{1,3}(\.\d{3})+(,\d+)?$/;
  if (dotThousands.test(s)) {
    s = s.replace(/\./g, "");
    s = s.replace(/,\d+$/, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  const commaDecimal = /^\d+(,\d+)?$/;
  if (commaDecimal.test(s)) {
    s = s.replace(",", ".");
    const f = parseFloat(s);
    return Number.isFinite(f) ? Math.round(f) : null;
  }
  const dotDecimal = /^\d+(\.\d+)?$/;
  if (dotDecimal.test(s)) {
    const f = parseFloat(s);
    return Number.isFinite(f) ? Math.round(f) : null;
  }
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.length > 12) {
    const clipped = digits.slice(0, 12);
    const n = Number(clipped);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
};

const PRICE_KEYS_CANON = [
  "Price List (IDR) to DPP",
  "Price List (IDR) To DPP",
  "DPP",
  "Price List (IDR) MSRP",
  "MSRP",
  "Price (MSRP)",
  "Price",
  "Partner Price",
  "PARTNER PRICE",
  "Bottom Price",
  "BOTTOM PRICE",
];

const pickMainPrice = (p: Product): number | null => {
  const d = safeParseDetails(p.details);
  for (const k of PRICE_KEYS_CANON) {
    if (k in d) {
      const n = parseRupiahLoose(d[k] as string | number | null | undefined);
      if (n) return n;
    }
  }
  if (typeof p.price === "number" && p.price > 0) return p.price;
  return null;
};

const daysBetween = (iso?: string) => {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Infinity;
  const diffMs = Date.now() - t;
  return diffMs / (1000 * 60 * 60 * 24);
};

/** ===================== Component ===================== */
export default function Dashboard() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // upload
  const [file, setFile] = useState<File | null>(null);

  // stats
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [sampleProducts, setSampleProducts] = useState<Product[]>([]);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // auth check
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [router]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  /** ===================== Fetch Stats ===================== */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError(null);

        const token = sessionStorage.getItem("token") || "";
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // 1) total products -> WEB route (no /api)
        const totalRes = await fetch(
          `${BASE_URL}/api/products/read?per_page=1&page=1`,
          { headers }
        );
        if (!totalRes.ok)
          throw new Error(`Products total HTTP ${totalRes.status}`);
        const totalJson: ApiReadResponse = await totalRes.json();
        const total = totalJson?.pagination?.total ?? 0;
        setTotalProducts(total);

        // 2) sample products for aggregation -> WEB route (no /api)
        const SAMPLE_SIZE = 200;
        const sampleRes = await fetch(
          `${BASE_URL}/api/products/read?per_page=${SAMPLE_SIZE}&page=1`,
          { headers }
        );
        if (!sampleRes.ok)
          throw new Error(`Products sample HTTP ${sampleRes.status}`);
        const sampleJson: ApiReadResponse = await sampleRes.json();
        setSampleProducts(sampleJson.data ?? []);

        // 3) total users -> API route (with /api)
        const usersRes = await fetch(`${BASE_URL}/api/users/all`, { headers });
        if (!usersRes.ok) throw new Error(`Users HTTP ${usersRes.status}`);
        const usersJson: unknown = await usersRes.json();
        const usersCount = Array.isArray(usersJson) ? usersJson.length : 0;
        setTotalUsers(usersCount);
      } catch (e) {
        setStatsError(
          e instanceof Error ? e.message : "Failed to load dashboard stats"
        );
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  /** ===================== Aggregations ===================== */
  const parsedProducts = useMemo(() => {
    return sampleProducts.map((p) => ({
      ...p,
      details: safeParseDetails(p.details),
      priceParsed: pickMainPrice(p),
    }));
  }, [sampleProducts]);

  const avgPrice = useMemo(() => {
    const prices = parsedProducts
      .map((p) => p.priceParsed)
      .filter((n): n is number => typeof n === "number" && n > 0);
    if (prices.length === 0) return null;
    const sum = prices.reduce((a, b) => a + b, 0);
    return Math.round(sum / prices.length);
  }, [parsedProducts]);

  const newLast30Days = useMemo(() => {
    return parsedProducts.filter((p) => daysBetween(p.created_at) <= 30).length;
  }, [parsedProducts]);

  const sheetDistribution = useMemo(() => {
    const counter = new Map<string, number>();
    parsedProducts.forEach((p) => {
      const key = p.sheet || "Unknown";
      counter.set(key, (counter.get(key) ?? 0) + 1);
    });
    return Array.from(counter.entries())
      .map(([sheet, count]) => ({ sheet, count }))
      .sort((a, b) => b.count - a.count);
  }, [parsedProducts]);

  const topSheets = sheetDistribution.slice(0, 6);
  const maxSheetCount = topSheets[0]?.count ?? 1;

  /** ===================== Upload Handlers ===================== */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      showNotification("File selected!", "success");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showNotification("Please select a file first.", "error");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      // Upload product -> API route (with /api)
      const res = await fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        showNotification(
          result.message || "File uploaded and processed successfully!",
          "success"
        );
      } else {
        showNotification(result.message || "Error uploading file.", "error");
      }
    } catch (error) {
      showNotification("Network error: " + String(error), "error");
    } finally {
      setIsLoading(false);
    }
  };

  /** ===================== UI ===================== */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard Overview
        </h1>
        <p className="text-gray-600">
          Welcome back! Here&apos;s what&apos;s happening with your data.
        </p>
      </div>

      {/* Loading skeleton */}
      {statsLoading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-200 rounded mb-3"></div>
              <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      )}

      {!statsLoading && statsError && (
        <div className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {statsError}
        </div>
      )}

      {/* Stats + Upload + Charts */}
      {!statsLoading && !statsError && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">
                Total Products
              </h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalProducts.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Sample analyzed: {parsedProducts.length}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">
                Average Price (sample)
              </h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {avgPrice ? formatRupiah(avgPrice) : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Detected from details/price fields
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">
                New in last 30 days
              </h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {newLast30Days.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-500 mt-1">Based on created_at</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {totalUsers.toLocaleString("id-ID")}
              </p>
              <p className="text-xs text-gray-500 mt-1">From /api/users/all</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sheet Distribution */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Sheets (by sample)
              </h3>
              {topSheets.length === 0 ? (
                <p className="text-sm text-gray-500">No data to display.</p>
              ) : (
                <div className="space-y-3">
                  {topSheets.map(({ sheet, count }) => {
                    const pct = Math.max(
                      4,
                      Math.round((count / maxSheetCount) * 100)
                    );
                    return (
                      <div key={sheet}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{sheet}</span>
                          <span className="text-gray-500">{count}</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded">
                          <div
                            className="h-3 bg-blue-600 rounded"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price Histogram */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Price Distribution (sample)
              </h3>
              <PriceHistogram products={parsedProducts} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** ===================== Price Histogram Component ===================== */
function PriceHistogram({
  products,
}: {
  products: Array<Product & { details: Details; priceParsed: number | null }>;
}) {
  const prices = useMemo(
    () =>
      products
        .map((p) => p.priceParsed)
        .filter((n): n is number => typeof n === "number" && n > 0),
    [products]
  );

  if (prices.length === 0) {
    return <p className="text-sm text-gray-500">No price data available.</p>;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const BUCKETS = 8;

  const buckets = new Array(BUCKETS).fill(0);
  const bucketRanges: Array<{ from: number; to: number }> = [];

  const step = (max - min) / BUCKETS || 1;
  for (let i = 0; i < BUCKETS; i++) {
    const from = Math.round(min + i * step);
    const to = Math.round(i === BUCKETS - 1 ? max : min + (i + 1) * step);
    bucketRanges.push({ from, to });
  }

  prices.forEach((price) => {
    let idx = Math.floor((price - min) / step);
    if (idx >= BUCKETS) idx = BUCKETS - 1;
    if (idx < 0) idx = 0;
    buckets[idx]++;
  });

  const maxCount = Math.max(...buckets);

  return (
    <div className="h-48 flex items-end justify-between gap-2">
      {buckets.map((count, i) => {
        const heightPct = Math.max(4, Math.round((count / maxCount) * 100));
        const label = bucketRanges[i]
          ? `${formatRupiah(bucketRanges[i].from)} - ${formatRupiah(
              bucketRanges[i].to
            )}`
          : "";
        return (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-blue-600 rounded-t"
              style={{ height: `${heightPct}%` }}
              title={`${label} • ${count}`}
            />
            <div className="mt-1 text-[10px] text-gray-500 text-center leading-tight line-clamp-2">
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
