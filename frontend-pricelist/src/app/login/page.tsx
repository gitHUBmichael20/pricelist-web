"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BASE_URL } from "@/config/api";

type AdminShape = { id?: number; name?: string; email?: string };
type LoginSuccess = { admin?: AdminShape; token?: string; message?: string };
type LoginError = { message?: string };

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      const res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let data: LoginSuccess | LoginError | null = null;
      try {
        data = await res.json();
      } catch {}

      if (res.ok) {
        const d = data as LoginSuccess;
        if (typeof window !== "undefined") {
          sessionStorage.setItem("isAuthenticated", "true");
          sessionStorage.setItem("adminId", String(d.admin?.id ?? ""));
          sessionStorage.setItem("name", d.admin?.name ?? "Admin");
          sessionStorage.setItem("email", d.admin?.email ?? email.trim());
          if (d.token) sessionStorage.setItem("token", d.token);
        }
        setStatus("success");
        setTimeout(() => router.push("/"), 1200);
      } else {
        const err = data as LoginError;
        setStatus("error");
        setErrorMsg(err.message || `Login failed (HTTP ${res.status})`);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Welcome Back <span className="text-green-600">Admin</span> 👋
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

        <form className="space-y-6 mt-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-800"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md
                           bg-white text-gray-900 placeholder-gray-500 focus:outline-none
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                placeholder="admin@admin.com"
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
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="mt-1 block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md
                             bg-white text-gray-900 placeholder-gray-500 focus:outline-none
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600"
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
            className={`w-full py-3 px-4 rounded-md text-white ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Simple debug info (dev only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-700">
            <p>
              <strong>Debug Info:</strong>
            </p>
            <p>API URL: {BASE_URL}/api/admin/login</p>
            <p>Email: {email || "Not entered"}</p>
            <p>Password: {password ? "***entered***" : "Not entered"}</p>
          </div>
        )}

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Not an admin?{" "}
            <Link
              href="/users/login-user"
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              Login as User now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
