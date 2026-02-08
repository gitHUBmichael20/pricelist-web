"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Categories from "./dashboard/categories";
import DashboardContent from "./dashboard/dashboard";
import Products from "./dashboard/products";
import User from "./dashboard/userList";
import Settings from "./dashboard/settings";
import Account from "./dashboard/account";
import Organize from "./dashboard/organize"; // Assuming you have the Organize component created.

export default function Dashboard() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("isAuthenticated")) {
      router.push("/login");
    }
  }, [router]);

  const renderPage = () => {
    switch (activePage) {
      case "categories":
        return <Categories />;
      case "products":
        return <Products />;
      case "account":
        return <Account />;
      case "settings":
        return <Settings />;
      case "userList":
        return <User />;
      case "organize":
        return <Organize />; // Render the Organize component here
      default:
        return <DashboardContent />;
    }
  };

  const dashboardItems = [
    { key: "account", label: "Account", icon: "account_circle" },
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "categories", label: "Categories", icon: "category" },
  ];

  const pageItems = [
    { key: "products", label: "List Products", icon: "inventory_2" },
    { key: "userList", label: "User List", icon: "people" },
    { key: "organize", label: "Organize", icon: "folder" }, // New "Organize" option with the "folder" icon
    { key: "settings", label: "Settings", icon: "settings" },
  ];

  const handleMenuClick = (key: string) => {
    setActivePage(key);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAuthenticated");
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile Menu Button */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg border border-gray-200 md:hidden"
        >
          <span className="material-icons text-gray-600">menu</span>
        </button>
      )}

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen bg-white shadow-lg border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 md:static md:transform-none`}
      >
        <div className="h-full flex flex-col px-4 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4 md:hidden">
              <h2 className="text-lg font-semibold text-gray-600">Menu</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <span className="material-icons text-gray-600">close</span>
              </button>
            </div>
            <h2 className="text-lg font-semibold text-gray-600 mb-4 hidden md:block">
              Dashboard Overview
            </h2>

            {/* User Info */}
            <div className="flex items-center mb-6 p-3 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                <span className="material-icons text-white text-sm">
                  person
                </span>
              </div>
              <span className="font-medium text-gray-800 truncate">
                {typeof window !== "undefined" && sessionStorage.getItem("name")
                  ? sessionStorage.getItem("name")
                  : "Guest"}
              </span>
            </div>

            {/* Dashboards Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Dashboards
              </h3>
              <ul className="space-y-1">
                {dashboardItems.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => handleMenuClick(item.key)}
                      className={`flex items-center w-full p-2 rounded-lg group transition-all duration-200 ${
                        activePage === item.key
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span
                        className={`material-icons text-sm mr-3 flex-shrink-0 ${
                          activePage === item.key
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pages Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Pages
              </h3>
              <ul className="space-y-1">
                {pageItems.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => handleMenuClick(item.key)}
                      className={`flex items-center w-full p-2 rounded-lg group transition-all duration-200 ${
                        activePage === item.key
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span
                        className={`material-icons text-sm mr-3 flex-shrink-0 ${
                          activePage === item.key
                            ? "text-blue-600"
                            : "text-gray-400"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-auto space-y-2">
              <div className="flex items-center justify-center p-2 bg-blue-50 rounded-lg">
                <span className="text-xs text-blue-600 font-medium text-center">
                  Arah Digital Teknologi
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-all"
              >
                <span className="material-icons text-sm mr-2">logout</span>
                <span className="text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-auto z-10">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 pl-16">
          <h1 className="text-lg font-semibold text-gray-800 capitalize">
            {activePage === "overview" ? "Dashboard" : activePage}
          </h1>
        </div>

        {/* Main Content */}
        <div className="p-4 md:p-8 h-full">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 h-fit">
            {renderPage()}
          </div>
        </div>
      </div>
    </div>
  );
}
