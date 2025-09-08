import { useState, useEffect } from "react";

type Product = {
  sheet: string;
  product_name: string;
  description?: string;
  details: Record<string, never>;
};

type ApiResponse = {
  success: boolean;
  message: string;
  total_products: number;
  data: Product[];
};

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    fetchProducts();
    // Check for saved dark mode preference
    const saved = localStorage.getItem("darkMode");
    if (saved) setDarkMode(JSON.parse(saved));
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/readfile");
      const data: ApiResponse = await response.json();

      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.message);
      }
    } catch {
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", JSON.stringify(newMode));
  };

  const formatKey = (key: string) => {
    return key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatPrice = (value: never) => {
    const str = String(value);
    if (str.includes("Rp") || str.includes("$")) {
      return (
        <span className="font-bold text-green-600 dark:text-green-400">
          {str}
        </span>
      );
    }
    return str;
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen ${
          darkMode ? "dark bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen ${
          darkMode ? "dark bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600 dark:text-red-400 text-center">
            <p className="text-xl font-semibold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
    >
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Product Catalog
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {products.length} products found
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden flex flex-col"
            >
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                    {product.sheet}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {product.product_name || "Unnamed Product"}
                </h3>

                {product.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Key Details Preview */}
                <div className="mb-4 flex-grow">
                  {Object.entries(product.details)
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center mb-1"
                      >
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatKey(key)}
                        </span>
                        <span className="text-xs text-gray-700 dark:text-gray-300 text-right ml-2">
                          {formatPrice(value)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Always at bottom */}
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="mt-auto w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedProduct.product_name || "Unnamed Product"}
                    </h3>
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      {selectedProduct.sheet}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                {selectedProduct.description && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      Description
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {Object.keys(selectedProduct.details).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Specifications
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(selectedProduct.details).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                          >
                            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                              {formatKey(key)}
                            </h5>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {formatPrice(value)}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
