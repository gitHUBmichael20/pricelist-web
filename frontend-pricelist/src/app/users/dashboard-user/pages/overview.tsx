"use client";

import { DollarSign, Package, Users, TrendingUp, Eye } from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here&apos;s what&apos;s happening with your business.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: "Total Sales",
            value: "$12,426",
            change: "+12%",
            icon: DollarSign,
            color: "text-green-600 bg-green-100",
          },
          {
            title: "Products",
            value: "248",
            change: "+3",
            icon: Package,
            color: "text-blue-600 bg-blue-100",
          },
          {
            title: "Customers",
            value: "1,249",
            change: "+18%",
            icon: Users,
            color: "text-purple-600 bg-purple-100",
          },
          {
            title: "Revenue",
            value: "$8,249",
            change: "+8%",
            icon: TrendingUp,
            color: "text-amber-600 bg-amber-100",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <p className="text-sm text-green-600 font-medium mt-1">
                  {stat.change} from last month
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Orders
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <Eye size={16} />
              View all
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              {
                customer: "John Smith",
                product: "iPhone 14",
                amount: "$999",
                status: "Completed",
              },
              {
                customer: "Sarah Johnson",
                product: "MacBook Pro",
                amount: "$2,499",
                status: "Processing",
              },
              {
                customer: "Mike Davis",
                product: "Nike Shoes",
                amount: "$129",
                status: "Shipped",
              },
            ].map((order, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {order.customer
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.customer}
                    </p>
                    <p className="text-sm text-gray-600">{order.product}</p>
                  </div>
                </div>
                <div className="text-right flex items-center space-x-4">
                  <p className="font-semibold text-gray-900">{order.amount}</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      order.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : order.status === "Processing"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
