import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [router]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

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

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/products", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        showNotification(result.message || "File uploaded and processed successfully!", "success");
      } else {
        showNotification(result.message || "Error uploading file.", "error");
      }
    } catch (error) {
      showNotification("Network error: " + error, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your data.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600">Active Users</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">2,318</p>
          <p className="text-xs text-green-600 mt-1">↗ +6.08%</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600">Total Products</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">1,247</p>
          <p className="text-xs text-green-600 mt-1">↗ +2.4%</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-sm font-medium text-gray-600">Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">$24,847</p>
          <p className="text-xs text-red-600 mt-1">↘ -1.2%</p>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">Upload Products</h3>
          <p className="text-sm opacity-90 mb-3">Upload via CSV or XLSX</p>
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileChange}
            className="mb-3 w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-white file:text-blue-700"
            disabled={isLoading}
          />
          <button
            className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
              isLoading ? "bg-white/20 cursor-not-allowed" : "bg-white/20 hover:bg-white/30"
            }`}
            onClick={handleUpload}
            disabled={isLoading}
          >
            {isLoading ? "Uploading..." : "Upload File"}
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fake Chart 1 - User Growth */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-48 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-end justify-around p-4">
            {[65, 45, 80, 90, 70, 85, 95].map((height, i) => (
              <div key={i} className="bg-blue-500 rounded-t" style={{ height: `${height}%`, width: '12%' }}></div>
            ))}
          </div>
        </div>

        {/* Traffic by Location */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic by Location</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                <span className="text-sm text-gray-600">United States</span>
              </div>
              <span className="text-sm font-medium">52.1%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
                <span className="text-sm text-gray-600">Canada</span>
              </div>
              <span className="text-sm font-medium">22.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Mexico</span>
              </div>
              <span className="text-sm font-medium">15.9%</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                <span className="text-sm text-gray-600">Other</span>
              </div>
              <span className="text-sm font-medium">11.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}