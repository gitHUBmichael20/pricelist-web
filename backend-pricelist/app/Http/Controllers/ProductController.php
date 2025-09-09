<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\Log;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{

    // ProductController.php
    public function getAllData(Request $request): JsonResponse
    {
        $perPage = $request->get('per_page', 20); // Default 20 items per page
        $page = $request->get('page', 1);

        $products = Product::paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'success' => true,
            'data' => $products->items(),
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
                'from' => $products->firstItem(),
                'to' => $products->lastItem(),
                'has_more_pages' => $products->hasMorePages(),
                'prev_page_url' => $products->previousPageUrl(),
                'next_page_url' => $products->nextPageUrl(),
            ]
        ]);
    }

    public function bacafile()
    {
        try {
            // File fixed (nggak dari request)
            $filePath = storage_path('app/public/testupload.xlsx');

            if (!file_exists($filePath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File tidak ditemukan: ' . $filePath
                ], 404);
            }

            // Parse Excel → array
            $result = $this->parseSpreadsheet($filePath);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal parse data',
                    'alerts'  => $result['alerts']
                ], 400);
            }

            // Simpan ke database
            $inserted = $this->saveProducts($result['products']);

            return response()->json([
                'success' => true,
                'message' => $inserted . ' data berhasil dimasukkan',
                'total_products' => $inserted,
                'generated_at' => now()->format('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            Log::error('Error parsing Excel file: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    private function parseSpreadsheet($path)
    {
        $result = [
            'success' => false,
            'alerts' => [],
            'products' => []
        ];

        try {
            $spreadsheet = IOFactory::load($path);
            $products = [];

            foreach ($spreadsheet->getAllSheets() as $sheet) {
                $sheetTitle = $sheet->getTitle();
                $rows = $sheet->toArray(null, true, true, false);

                // Bersihkan baris kosong
                $rows = array_values(array_filter($rows, function ($row) {
                    foreach ($row as $cell) {
                        if (trim((string)$cell) !== '') return true;
                    }
                    return false;
                }));

                if (count($rows) < 2) continue;

                // Ambil tabel sampai baris kosong
                $tableRows = [];
                foreach ($rows as $row) {
                    $isEmpty = true;
                    foreach ($row as $cell) {
                        if (trim((string)$cell) !== '') {
                            $isEmpty = false;
                            break;
                        }
                    }
                    if ($isEmpty && !empty($tableRows)) break;
                    if (!$isEmpty) $tableRows[] = $row;
                }

                if (count($tableRows) >= 2) {
                    $products = array_merge($products, $this->parseTableMode($tableRows, $sheetTitle));
                }
            }

            $result['success'] = true;
            $result['products'] = $products;
        } catch (\Exception $e) {
            $result['alerts'][] = "Error loading file: " . $e->getMessage();
        }

        return $result;
    }

    private function parseTableMode($rows, $sheetTitle)
    {
        $products = [];
        $headerRow = $rows[0];

        // Normalize headers
        $headers = array_map([$this, 'normalizeKey'], $headerRow);

        $columnMap = [];
        foreach ($headers as $index => $header) {
            if ($header !== '') {
                $columnMap[$index] = $header;
            }
        }

        for ($rowIndex = 1; $rowIndex < count($rows); $rowIndex++) {
            $row = $rows[$rowIndex];
            $productData = [];

            foreach ($columnMap as $colIndex => $key) {
                $value = $row[$colIndex] ?? '';
                if (trim((string)$value) !== '') {
                    $productData[$key] = $value;
                }
            }

            if (empty($productData)) continue;

            // Detect product name
            $productNameKey = null;
            foreach (array_keys($productData) as $key) {
                if ($this->isProductKey($key)) {
                    $productNameKey = $key;
                    break;
                }
            }
            if (!$productNameKey) $productNameKey = array_key_first($productData);
            $productName = $productData[$productNameKey] ?? null;

            // Detect description
            $descriptionKey = $this->findDescriptionKey(array_keys($productData));
            $description = $descriptionKey ? ($productData[$descriptionKey] ?? null) : null;

            if (!$description) {
                foreach ($productData as $value) {
                    if (strlen((string)$value) >= 100) {
                        $description = $value;
                        break;
                    }
                }
            }

            if ($productNameKey) unset($productData[$productNameKey]);
            if ($descriptionKey) unset($productData[$descriptionKey]);

            $productData = array_filter($productData, fn($v) => trim((string)$v) !== '');

            $products[] = [
                'sheet' => $sheetTitle,
                'product_name' => $productName,
                'description' => $description,
                'details' => $productData
            ];
        }

        return $products;
    }

    private function saveProducts(array $products)
    {
        $data = [];
        foreach ($products as $p) {
            $data[] = [
                'sheet'       => $p['sheet'] ?? null,
                'model'       => $p['product_name'] ?? null,
                'description' => $p['description'] ?? null,
                'details'     => json_encode($p['details'] ?? []),
                'created_at'  => now(),
                'updated_at'  => now()
            ];
        }

        try {
            Product::insert($data); // bulk insert
            return count($data);
        } catch (\Exception $e) {
            Log::error("Gagal insert products: " . $e->getMessage());
            return 0;
        }
    }

    private function normalizeKey($string)
    {
        $string = (string)$string;
        $string = trim(mb_strtolower($string));
        $string = preg_replace('/[^\p{L}\p{N}\s_-]+/u', '', $string);
        $string = preg_replace('/\s+/', ' ', $string);
        return str_replace(' ', '_', trim($string));
    }

    private function isProductKey($key)
    {
        $key = strtolower((string)$key);
        $keywords = ['product', 'model', 'name', 'sku', 'code', 'title', 'type', 'part', 'number'];
        foreach ($keywords as $kw) {
            if (strpos($key, $kw) !== false) return true;
        }
        return false;
    }

    private function findDescriptionKey($keys)
    {
        $descKeywords = ['desc', 'description', 'keterangan', 'note', 'notes'];
        foreach ($keys as $key) {
            foreach ($descKeywords as $kw) {
                if (preg_match('/\b' . $kw . '\b/i', $key)) return $key;
            }
        }
        return null;
    }
}
