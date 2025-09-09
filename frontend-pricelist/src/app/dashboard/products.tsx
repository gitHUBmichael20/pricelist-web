import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

type Product = {
  id: number;
  sheet: string;
  model: string;
  description?: string | null;
  details: Record<string, string | number>;
};

type PaginationInfo = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  has_more_pages: boolean;
  prev_page_url?: string | null;
  next_page_url?: string | null;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  data: Product[];
  pagination: PaginationInfo;
};

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
    has_more_pages: false,
    prev_page_url: null,
    next_page_url: null,
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  const fetchProducts = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "20",
      });

      const response = await fetch(
        `http://192.168.1.49:8000/products/read?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      console.log("API Response:", data);

      if (data.success && Array.isArray(data.data)) {
        setProducts(data.data);
        setPagination(data.pagination);
      } else {
        setError("Invalid data format received");
        console.error("Invalid data format:", data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.last_page) {
      setCurrentPage(page);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pagination.last_page) {
      handlePageChange(currentPage + 1);
    }
  };

  const formatKey = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const formatValue = (value: string | number) => {
    const str = String(value);
    if (str.includes("Rp") || str.includes("$")) {
      return <span className="font-bold text-green-600">{str}</span>;
    }
    return str;
  };

  const getVisiblePageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(pagination.last_page - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < pagination.last_page - 1) {
      rangeWithDots.push("...", pagination.last_page);
    } else {
      rangeWithDots.push(pagination.last_page);
    }

    return rangeWithDots;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-red-600 text-center">
          <p className="text-xl font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={() => fetchProducts(1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Product Catalog
            </h1>
            <p className="text-gray-600 mt-1">
              {pagination.total} total products • Showing {pagination.from}-
              {pagination.to} of {pagination.total}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {pagination.last_page}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition flex flex-col"
            >
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                    {product.sheet}
                  </span>
                </div>

                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.model || "Unnamed Product"}
                </h3>

                {product.description && (
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Key Details Preview */}
                <div className="mb-4 flex-grow">
                  {Object.entries(product.details || {})
                    .slice(0, 2)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center mb-1"
                      >
                        <span className="text-xs text-gray-500">
                          {formatKey(key)}
                        </span>
                        <span className="text-xs text-gray-700 text-right ml-2">
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                </div>

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

        {/* Pagination */}
        {pagination.last_page > 1 && (
          <div className="flex items-center justify-center space-x-2 bg-white p-4 rounded-lg shadow-sm">
            {/* Previous Button */}
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {getVisiblePageNumbers().map((page, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (typeof page === "number") {
                      handlePageChange(page);
                    }
                  }}
                  disabled={page === "..."}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    typeof page === "number"
                      ? page === currentPage
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                      : "text-gray-400 cursor-default"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            {/* Next Button */}
            <button
              onClick={handleNextPage}
              disabled={currentPage === pagination.last_page}
              className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPage === pagination.last_page
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Next
              <ChevronRightIcon className="h-4 w-4" />
            </button>

            {/* Items per page info */}
            <div className="text-sm text-gray-500 ml-4">
              {pagination.per_page} per page
            </div>
          </div>
        )}

        {/* Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedProduct.model || "Unnamed Product"}
                  </h3>
                  <span className="text-sm text-blue-600 font-medium">
                    {selectedProduct.sheet}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✖
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                {selectedProduct.description && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Description
                    </h4>
                    <p className="text-gray-700 whitespace-pre-line">
                      {selectedProduct.description}
                    </p>
                  </div>
                )}

                {Object.keys(selectedProduct.details || {}).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Specifications
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(selectedProduct.details).map(
                        ([key, value]) => (
                          <div key={key} className="bg-gray-50 p-3 rounded-lg">
                            <h5 className="text-sm font-medium text-gray-900 mb-1">
                              {formatKey(key)}
                            </h5>
                            <p className="text-sm text-gray-600">
                              {formatValue(value)}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200">
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
