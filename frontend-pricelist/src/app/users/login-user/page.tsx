"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BASE_URL } from "@/config/api";

type FlatUser = {
  id: number;
  name: string;
  email: string;
  sheet_access?: string | null;
};

type ApiLoginResponse = {
  success?: boolean;
  message?: string;
  // Your API sometimes returns data as FlatUser, sometimes as { user, token }
  data?: FlatUser | { user: FlatUser; token?: string };
  // Some implementations also put token at the top level
  token?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFlatUser(v: unknown): v is FlatUser {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "number" &&
    typeof v.name === "string" &&
    typeof v.email === "string"
  );
}

function extractUserAndToken(json: unknown): {
  user?: FlatUser;
  token?: string;
  message?: string;
} {
  if (!isRecord(json)) return {};
  const message = typeof json.message === "string" ? json.message : undefined;

  // Ensure success
  if (json.success !== true) return { message };

  const topToken = typeof json.token === "string" ? json.token : undefined;
  const data = json.data;

  // data as FlatUser
  if (isFlatUser(data)) {
    return { user: data, token: topToken, message };
  }

  // data as { user: FlatUser; token?: string }
  if (isRecord(data) && isFlatUser(data.user)) {
    const nestedToken = typeof data.token === "string" ? data.token : undefined;
    return { user: data.user, token: nestedToken ?? topToken, message };
  }

  return { message };
}

export default function LoginUser() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // If already authenticated, go to dashboard (avoid looping to /login)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem("isAuthenticated") === "true"
    ) {
      router.replace("/users/dashboard-user");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrorMsg(null);

    if (!email || !password) {
      setStatus("error");
      setErrorMsg("Please fill in both email and password");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = (await res.json()) as unknown;
      const { user, token, message } = extractUserAndToken(json);

      if (!res.ok || !user) {
        setStatus("error");
        setErrorMsg(message || "Login failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      // Persist session
      sessionStorage.setItem("isAuthenticated", "true");
      sessionStorage.setItem("id", String(user.id ?? ""));
      sessionStorage.setItem("name", user.name ?? "User");
      sessionStorage.setItem("email", user.email ?? email.trim());
      sessionStorage.setItem("sheet_access", user.sheet_access ?? "");
      if (token) sessionStorage.setItem("token", token);

      setStatus("success");
      setTimeout(() => router.replace("/users/dashboard-user"), 800);
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword((prev) => !prev);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome Back <span className="text-blue-600">Users</span> 👋
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please sign in to your account
          </p>
        </div>

        {status === "success" && (
          <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 rounded-lg border border-green-300">
            ✅ Login successful! Redirecting...
          </div>
        )}

        {status === "error" && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-lg border border-red-300">
            ❌ {errorMsg || "Login failed. Please try again."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-8">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-800"
              >
                Email address
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full px-3 py-2 rounded-md shadow-sm
                   border border-gray-300
                   bg-white
                   text-gray-900 placeholder-gray-500
                   caret-blue-600
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   disabled:opacity-60"
                placeholder="example@domain.com"
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-800"
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="mt-1 block w-full px-3 py-2 pr-10 rounded-md shadow-sm
                     border border-gray-300
                     bg-white
                     text-gray-900 placeholder-gray-500
                     caret-blue-600
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     disabled:opacity-60"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 disabled:text-gray-400"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-medium text-white ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>API URL: {BASE_URL}/api/users/login</p>
            <p>Email: {email || "Not entered"}</p>
            <p>Password: {password ? "***entered***" : "Not entered"}</p>
          </div>
        )}

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Not an admin?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              Login as Admin now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
