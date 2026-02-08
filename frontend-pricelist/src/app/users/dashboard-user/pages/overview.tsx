"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Package, Users, TrendingUp, Eye } from "lucide-react";
import { BASE_URL } from "@/config/api";

/* ======================= Types ======================= */
type Details = Record<string, string | number>;

type Product = {
  id: number;
  sheet: string;
  model: string;
  description?: string | null;
  price?: number | null;
  details: unknown; // will parse to Details
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

/* ======================= Helpers ======================= */
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

/* ======================= Component ======================= */
export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sheets, setSheets] = useState<string[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sampleProducts, setSampleProducts] = useState<Product[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);

        // 1) Ambil daftar sheet dari sessionStorage
        const access = sessionStorage.getItem("sheet_access") || "";
        const list = access
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean);

        setSheets(list);

        if (list.length === 0) {
          setErr("No sheet access found for this user");
          setLoading(false);
          return;
        }

        const token = sessionStorage.getItem("token") || "";
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // 2) Untuk tiap sheet, ambil total dan sampel
        const SAMPLE_PER_SHEET = 100; // sesuaikan kebutuhan
        const totalsPromises = list.map(async (sheet) => {
          const r = await fetch(
            `${BASE_URL}/api/products/read?per_page=1&page=1&sheet=${encodeURIComponent(
              sheet
            )}`,
            { headers }
          );
          if (!r.ok)
            throw new Error(`/products/read total ${sheet} HTTP ${r.status}`);
          const j: ApiReadResponse = await r.json();
          return j.pagination?.total ?? 0;
        });

        const samplesPromises = list.map(async (sheet) => {
          const r = await fetch(
            `${BASE_URL}/api/products/read?per_page=${SAMPLE_PER_SHEET}&page=1&sheet=${encodeURIComponent(
              sheet
            )}`,
            { headers }
          );
          if (!r.ok)
            throw new Error(`/products/read sample ${sheet} HTTP ${r.status}`);
          const j: ApiReadResponse = await r.json();
          return j.data ?? [];
        });

        const totals = await Promise.all(totalsPromises);
        const samples = await Promise.all(samplesPromises);

        const totalAgg = totals.reduce((a, b) => a + b, 0);
        const sampleAgg = samples.flat();

        setTotalProducts(totalAgg);
        setSampleProducts(sampleAgg);
      } catch (e) {
        setErr(
          e instanceof Error ? e.message : "Failed to load overview stats"
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  /* ======================= Aggregations ======================= */
  const parsed = useMemo(() => {
    return sampleProducts.map((p) => ({
      ...p,
      details: safeParseDetails(p.details),
      priceParsed: pickMainPrice(p),
    }));
  }, [sampleProducts]);

  const avgPrice = useMemo(() => {
    const prices = parsed
      .map((p) => p.priceParsed)
      .filter((n): n is number => typeof n === "number" && n > 0);
    if (prices.length === 0) return null;
    const sum = prices.reduce((a, b) => a + b, 0);
    return Math.round(sum / prices.length);
  }, [parsed]);

  const newLast30 = useMemo(
    () => parsed.filter((p) => daysBetween(p.created_at) <= 30).length,
    [parsed]
  );

  const sheetDist = useMemo(() => {
    const map = new Map<string, number>();
    parsed.forEach((p) => {
      const key = p.sheet || "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([sheet, count]) => ({ sheet, count }))
      .sort((a, b) => b.count - a.count);
  }, [parsed]);

  const topSheets = sheetDist.slice(0, 4);
  const maxCount = topSheets[0]?.count ?? 1;

  const recentProducts = useMemo(() => {
    return [...parsed]
      .sort((a, b) => {
        const ta = Date.parse(a.created_at || "") || 0;
        const tb = Date.parse(b.created_at || "") || 0;
        return tb - ta;
      })
      .slice(0, 6);
  }, [parsed]);

  /* ======================= UI ======================= */
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here&apos;s what&apos;s happening with your business.
        </p>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse"
            >
              <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
              <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {err}
        </div>
      )}

      {!loading && !err && (
        <>
          {/* Stats Cards (real data) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Accessible Products"
              value={totalProducts.toLocaleString("id-ID")}
              change={
                sheets.length > 1 ? `${sheets.length} sheets` : sheets[0] || "—"
              }
              Icon={Package}
              color="text-blue-600 bg-blue-100"
            />

            <StatCard
              title="Average Price (sample)"
              value={avgPrice ? formatRupiah(avgPrice) : "—"}
              change="From detected price fields"
              Icon={DollarSign}
              color="text-green-600 bg-green-100"
            />

            <StatCard
              title="New in last 30 days"
              value={newLast30.toLocaleString("id-ID")}
              change="Based on created_at"
              Icon={TrendingUp}
              color="text-amber-600 bg-amber-100"
            />

            <StatCard
              title="Top Sheet (sample)"
              value={topSheets[0]?.sheet ?? "—"}
              change={topSheets[0] ? `${topSheets[0].count} items` : "No data"}
              Icon={Users}
              color="text-purple-600 bg-purple-100"
            />
          </div>

          {/* Top Sheets bar mini */}
          {topSheets.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Top Sheets (by sample)
              </h3>
              <div className="space-y-3">
                {topSheets.map(({ sheet, count }) => {
                  const pct = Math.max(6, Math.round((count / maxCount) * 100));
                  return (
                    <div key={sheet}>
                      <div className="flex items-center justify-between text-sm mb-1">
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
            </div>
          )}

          {/* Recent Products (replace fake orders) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Products
                </h3>
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  onClick={() => {
                    // optional: navigate to list page with first sheet filter
                    if (sheets[0]) {
                      const url = `/users/dashboard-user/pages/list-product?sheet=${encodeURIComponent(
                        sheets[0]
                      )}`;
                      window.location.href = url;
                    }
                  }}
                >
                  <Eye size={16} />
                  View list
                </button>
              </div>
            </div>
            <div className="p-6">
              {recentProducts.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No recent products available.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentProducts.map((p) => {
                    const price = pickMainPrice(p);
                    const initials =
                      p.model
                        ?.split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "PR";
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-1">
                              {p.model || "Unnamed Product"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {p.sheet} •{" "}
                              {p.created_at
                                ? new Date(p.created_at).toLocaleDateString(
                                    "id-ID"
                                  )
                                : "unknown date"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center space-x-4">
                          <p className="font-semibold text-gray-900">
                            {price ? formatRupiah(price) : "—"}
                          </p>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-200">
                            #{p.id}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ======================= Small component ======================= */
function StatCard({
  title,
  value,
  change,
  Icon,
  color,
}: {
  title: string;
  value: string | number;
  change: string;
  Icon: React.ComponentType<{ size?: number }>;
  color: string; // e.g. "text-blue-600 bg-blue-100"
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-green-600 font-medium mt-1">{change}</p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
