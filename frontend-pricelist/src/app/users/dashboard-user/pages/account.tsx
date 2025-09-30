"use client";

import { useEffect, useState } from "react";
import { BASE_URL } from "@/config/api";

type UpdatePayload = {
  name: string;
  email: string;
  // sheet_access included but shown as read-only in UI (still sent to keep backend in sync)
  sheet_access?: string;
};

type UpdateSuccess = {
  success: true;
  message?: string;
  data?: {
    id: number;
    name: string;
    email: string;
    sheet_access?: string;
  };
};

type UpdateError = { success?: false; message?: string };

export default function Account() {
  const [userId, setUserId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [sheetAccess, setSheetAccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [message, setMessage] = useState<string>("");

  // Prefill user data from sessionStorage when the page is loaded
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = sessionStorage.getItem("id") || "";
      const storedName = sessionStorage.getItem("name") || "";
      const storedEmail = sessionStorage.getItem("email") || "";
      const storedSheetAccess = sessionStorage.getItem("sheet_access") || "";

      setUserId(storedUserId);
      setName(storedName);
      setEmail(storedEmail);
      setSheetAccess(storedSheetAccess);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setMessage("");

    try {
      if (!userId) throw new Error("User ID not found in session");
      if (!name.trim() || !email.trim())
        throw new Error("Name and Email cannot be empty");

      const token = sessionStorage.getItem("token") || "";

      const body: UpdatePayload = {
        name: name.trim(),
        email: email.trim(),
        sheet_access: sheetAccess, // keep in sync, but UI is read-only
      };

      const res = await fetch(`${BASE_URL}/api/users/update/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as UpdateSuccess | UpdateError;

      if (!res.ok || (data as UpdateError).success === false) {
        throw new Error(
          (data as UpdateError).message ||
            `Failed to update (HTTP ${res.status})`
        );
      }

      if ((data as UpdateSuccess).data) {
        const u = (data as UpdateSuccess).data!;
        sessionStorage.setItem("name", u.name);
        sessionStorage.setItem("email", u.email);
        sessionStorage.setItem("sheet_access", u.sheet_access ?? "");

        setName(u.name);
        setEmail(u.email);
        setSheetAccess(u.sheet_access ?? "");
      }

      setStatus("success");
      setMessage("Profile updated successfully.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Failed to update profile"
      );
    } finally {
      setLoading(false);
      setTimeout(() => {
        setStatus(null);
        setMessage("");
      }, 3000);
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      const storedName = sessionStorage.getItem("name") || "";
      const storedEmail = sessionStorage.getItem("email") || "";
      const storedSheetAccess = sessionStorage.getItem("sheet_access") || "";
      setName(storedName);
      setEmail(storedEmail);
      setSheetAccess(storedSheetAccess);
      setStatus(null);
      setMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50/60">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Your Profile
          </h1>
          <p className="mt-2 text-slate-500">
            Manage your personal information and access settings.
          </p>
        </header>

        {status && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm ${
              status === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Account details
              </h2>
              <p className="text-sm text-slate-500">
                Make sure your information is accurate.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-800"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-800"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            {/* Sheet Access - read-only display of current access */}
            <div className="space-y-2 mt-6">
              <label
                htmlFor="sheet_access"
                className="text-sm font-medium text-slate-800"
              >
                Sheet Access
              </label>
              <input
                id="sheet_access"
                name="sheet_access"
                type="text"
                value={sheetAccess}
                readOnly
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600"
              />
              <p className="text-xs text-slate-500">
                This is your current access. Contact an admin to change it.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="mt-6 p-4 bg-gray-100 rounded-xl text-xs text-gray-600">
                <p className="font-semibold mb-2">Debug Info:</p>
                <p>User ID: {userId || "Not found"}</p>
                <p>
                  API URL: {BASE_URL}/api/users/update/{userId}
                </p>
                <p>Current Name: {name}</p>
                <p>Current Email: {email}</p>
                <p>Current Sheet Access: {sheetAccess}</p>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => window.history.back()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
