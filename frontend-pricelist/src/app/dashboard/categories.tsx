"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";

type Product = {
  id: number;
  sheet: string;
  model: string;
  description?: string | null;
  details: Record<string, string | number>;
};

type Category = {
  sheet: string;
  count: number;
  products: Product[];
};

type PaginationInfo = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
  has_more_pages: boolean;
};

type ApiResponse = {
  success?: boolean;
  data: Product[];
  pagination: PaginationInfo;
};

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
    from: 0,
    to: 0,
    has_more_pages: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all products first to group by categories
      const response = await fetch(
        `http://192.168.1.49:8000/products/read?page=1&per_page=1000`
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data: ApiResponse = await response.json();

      if (data.success && Array.isArray(data.data)) {
        const normalizedProducts = data.data.map((product) => ({
          ...product,
          details:
            typeof product.details === "string"
              ? JSON.parse(product.details || "{}")
              : product.details,
        }));

        // Group products by sheet
        const categoryMap = new Map<string, Product[]>();
        normalizedProducts.forEach((product) => {
          if (!categoryMap.has(product.sheet)) {
            categoryMap.set(product.sheet, []);
          }
          categoryMap.get(product.sheet)!.push(product);
        });

        // Convert to Category array
        const categoriesArray = Array.from(categoryMap.entries()).map(
          ([sheet, products]) => ({
            sheet,
            count: products.length,
            products: products.sort((a, b) => a.model.localeCompare(b.model)),
          })
        );

        // Sort categories by name
        categoriesArray.sort((a, b) => a.sheet.localeCompare(b.sheet));
        setCategories(categoriesArray);
      } else {
        setError("Invalid data format received");
      }
    } catch (error) {
      setError("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const formatKey = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const formatValue = (value: string | number) => {
    const str = String(value);
    if (!isNaN(Number(str)) && str.length > 4) {
      return (
        <span className="font-bold text-green-600">
          Rp {Number(str).toLocaleString("id-ID")}
        </span>
      );
    }
    return str;
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-red-500",
      "bg-yellow-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-red-600 text-center">
          <p className="text-lg font-semibold">{error}</p>
          <button
            onClick={fetchCategories}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Category view
  if (!selectedCategory) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Product Categories
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {categories.length} categories •{" "}
              {categories.reduce((sum, cat) => sum + cat.count, 0)} total
              products
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categories.map((category, index) => (
              <div
                key={category.sheet}
                onClick={() => setSelectedCategory(category)}
                className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1 overflow-hidden group"
              >
                {/* Colored header */}
                <div className={`${getCategoryColor(index)} h-3`}></div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <FolderIcon className="h-8 w-8 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    <span className="text-2xl font-bold text-gray-900">
                      {category.count}
                    </span>
                  </div>

                  <h3 className="font-bold text-gray-900 mb-2 text-lg group-hover:text-blue-600 transition-colors">
                    {category.sheet}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {category.count} product{category.count !== 1 ? "s" : ""}
                  </p>

                  {/* Preview of first few products */}
                  <div className="mt-3 space-y-1">
                    {category.products.slice(0, 3).map((product, idx) => (
                      <div key={idx} className="text-xs text-gray-400 truncate">
                        • {product.model}
                      </div>
                    ))}
                    {category.count > 3 && (
                      <div className="text-xs text-gray-400">
                        ... and {category.count - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Products in selected category view
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4 text-sm"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Back to Categories
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {selectedCategory.sheet}
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            {selectedCategory.count} product
            {selectedCategory.count !== 1 ? "s" : ""} in this category
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {selectedCategory.products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
            >
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm sm:text-base">
                  {product.model || "Unnamed Product"}
                </h3>

                {product.description && (
                  <p className="text-gray-600 text-xs sm:text-sm mb-3 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Preview Details */}
                <div className="space-y-1 mb-4 flex-grow">
                  {Object.entries(product.details || {})
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center"
                      >
                        <span className="text-xs text-gray-500 truncate">
                          {formatKey(key)}
                        </span>
                        <span className="text-xs text-gray-700 ml-2 flex-shrink-0">
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                </div>

                <button
                  onClick={() => setSelectedProduct(product)}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors mt-auto"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {selectedProduct.model || "Unnamed Product"}
                </h3>
                <span className="text-xs sm:text-sm text-blue-600 font-medium">
                  {selectedProduct.sheet}
                </span>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
              >
                <span className="text-lg sm:text-xl">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1">
              {selectedProduct.description && (
                <div className="mb-4 sm:mb-5">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-2">
                    Description
                  </h4>
                  <p className="text-gray-700 text-xs sm:text-sm">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {Object.keys(selectedProduct.details || {}).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 sm:mb-3">
                    Specifications
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    {Object.entries(selectedProduct.details).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="bg-gray-50 p-2 sm:p-3 rounded-lg"
                        >
                          <h5 className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                            {formatKey(key)}
                          </h5>
                          <div className="text-xs sm:text-sm text-gray-900 font-semibold">
                            {formatValue(value)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
