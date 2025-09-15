"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface FormData {
  name: string;
  email: string;
  password: string;
}

export default function AdminEdit() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<null | "success" | "error">(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFormData((prev) => ({
        ...prev,
        name: sessionStorage.getItem("name") || "Admin",
        email: sessionStorage.getItem("email") || "admin@example.com",
      }));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const token = sessionStorage.getItem("token") || "";
      const response = await fetch(
        "http://192.168.1.49:8000/api/admin/updateprofile/1",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem("name", data.admin.name);
        sessionStorage.setItem("email", data.admin.email);
        setStatus("success");
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus(null), 5000);
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      setTimeout(() => setStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className=" min-h-fit bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md sm:max-w-lg lg:max-w-2xl w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Admin Profile
          </h2>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Update your account information
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20">
          {/* Status Messages */}
          {status === "success" && (
            <div className="mb-6 p-4 text-sm bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center animate-fade-in">
              <span className="material-icons text-green-500 mr-2 text-lg">
                check_circle
              </span>
              Profile updated successfully!
            </div>
          )}
          {status === "error" && (
            <div className="mb-6 p-4 text-sm bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center animate-fade-in">
              <span className="material-icons text-red-500 mr-2 text-lg">
                error
              </span>
              Failed to update profile. Please try again.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name & Email Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  <span className="material-icons text-gray-400 mr-2 text-lg">
                    person
                  </span>
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-all duration-200"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="flex items-center text-sm font-medium text-gray-700"
                >
                  <span className="material-icons text-gray-400 mr-2 text-lg">
                    email
                  </span>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-all duration-200"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="flex items-center text-sm font-medium text-gray-700"
              >
                <span className="material-icons text-gray-400 mr-2 text-lg">
                  lock
                </span>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 transition-all duration-200"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="material-icons text-lg">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep current password
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:flex-1 px-6 py-3 rounded-xl shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center ${
                  loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-2 text-lg">save</span>
                    Update Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleDateString("id-ID")}
          </p>
        </div>
      </div>

      {/* Material Icons */}
      <link
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
        rel="stylesheet"
      />

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
