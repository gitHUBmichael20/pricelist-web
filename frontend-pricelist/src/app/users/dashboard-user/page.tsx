"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Package,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

// import halaman
import OverviewPage from "./pages/overview";
import ListProduct from "./pages/list-product";
import SettingsPage from "./pages/settings";

export default function DashboardUser() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("overview");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // cek session
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("isAuthenticated");
      if (auth === "true") {
        setIsAuthenticated(true);
      } else {
        router.push("/login-user"); // kalau belum login, redirect ke login
      }
    }
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.clear(); // hapus semua session
    }
    router.push("/login-user");
  };

  const renderPage = () => {
    switch (activePage) {
      case "products":
        return <ListProduct />;
      case "settings":
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  const navItems = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "products", label: "Products", icon: Package },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "block" : "hidden"
          } lg:block w-64 bg-white border-r border-gray-200 min-h-screen shadow-sm`}
        >
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          </div>

          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setActivePage(item.key);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                  activePage === item.key
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium text-red-600 hover:bg-red-50 transition-colors mt-4"
            >
              <LogOut size={20} />
              Logout
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 lg:p-8 max-w-7xl">{renderPage()}</div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
