"use client";

import { useState } from "react";
import Analytics from "./dashboard/analytics";
import Dashboard from "./dashboard/dashboard";
import Products from "./dashboard/products";
import Settings from "./dashboard/settings";
import Account from "./dashboard/account";
// import Link from "next/link";

export default function Home() {
  const [activePage, setActivePage] = useState("overview");

  const renderPage = () => {
    switch (activePage) {
      case "categories":
        return <Analytics />;
      case "products":
        return <Products />;
      case "account":
        return <Account />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  const userMenuItems = [
    { key: "account", label: "Account", icon: "account_circle" },
    { key: "history", label: "History", icon: "history" },
  ];

  const dashboardItems = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "categories", label: "Categories", icon: "category" },
  ];

  const pageItems = [
    { key: "products", label: "List Products", icon: "inventory_2" },
    { key: "settings", label: "Settings", icon: "settings" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-40 w-64 h-screen bg-white shadow-lg border-r border-gray-200">
        <div className="h-full px-4 py-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-600 mb-4">
              Dashboard Overview
            </h2>

            {/* User Info */}
            <div className="flex items-center mb-6 p-3 rounded-lg bg-gray-50">
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center mr-3">
                <span className="material-icons text-white text-sm">
                  person
                </span>
              </div>
              <span className="font-medium text-gray-800">John Doe</span>
            </div>

            {/* User Menu */}
            <ul className="space-y-1 mb-6">
              {userMenuItems.map((item) => (
                <li key={item.key}>
                  <button
                    onClick={() => setActivePage(item.key)}
                    className={`flex items-center w-full p-2 rounded-lg group transition-all duration-200 ${
                      activePage === item.key
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={`material-icons text-sm mr-3 ${
                        activePage === item.key
                          ? "text-blue-600"
                          : "text-gray-400"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
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
                    onClick={() => setActivePage(item.key)}
                    className={`flex items-center w-full p-2 rounded-lg group transition-all duration-200 ${
                      activePage === item.key
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={`material-icons text-sm mr-3 ${
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
                    onClick={() => setActivePage(item.key)}
                    className={`flex items-center w-full p-2 rounded-lg group transition-all duration-200 ${
                      activePage === item.key
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span
                      className={`material-icons text-sm mr-3 ${
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
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-center p-2 bg-blue-50 rounded-lg">
              <span className="text-xs text-blue-600 font-medium">
                Arah Digital Teknologi
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="p-8 ml-64 w-full">
        <div className="bg-white rounded-lg shadow-sm p-6">{renderPage()}</div>
      </div>

      {/* Material Icons Link */}
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />
    </div>
  );
}
