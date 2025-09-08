<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Illuminate\Support\Facades\Log;

class ProductController extends Controller
{
    public function bacafile(Request $request)
    {
        try {
            // Default file path atau dari parameter
            $filePath = $request->get('file', storage_path('app/public/testupload.xlsx'));

            // Cek apakah file exists
            if (!file_exists($filePath)) {
                return response()->json([
                    'success' => false,
                    'message' => 'File tidak ditemukan: ' . $filePath,
                    'data' => []
                ], 404);
            }

            // Parse spreadsheet
            $result = $this->parseSpreadsheet($filePath);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['success'] ? 'Data berhasil diparse' : 'Gagal parse data',
                'alerts' => $result['alerts'] ?? [],
                'total_products' => count($result['products']),
                'data' => $result['products'],
                'generated_at' => now()->format('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            Log::error('Error parsing Excel file: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage(),
                'data' => []
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
            // Load spreadsheet
            $spreadsheet = IOFactory::load($path);
            $products = [];

            // Loop semua sheets
            foreach ($spreadsheet->getAllSheets() as $sheet) {
                $sheetTitle = $sheet->getTitle();

                // Convert ke array
                $rows = $sheet->toArray(null, true, true, false);

                // Remove empty rows
                $rows = array_values(array_filter($rows, function ($row) {
                    foreach ($row as $cell) {
                        if (trim((string)$cell) !== '') return true;
                    }
                    return false;
                }));

                if (count($rows) < 1) continue;

                // Cek apakah table mode (ada header)
                $headerRow = $rows[0];
                $nonEmptyCols = 0;
                foreach ($headerRow as $cell) {
                    if (trim((string)$cell) !== '') $nonEmptyCols++;
                }

                $isTableMode = $nonEmptyCols >= 2 && count($rows) >= 2;

                if ($isTableMode) {
                    // Table mode - ada header
                    $products = array_merge($products, $this->parseTableMode($rows, $sheetTitle));
                } else {
                    // Simple mode - tanpa header yang jelas
                    $products = array_merge($products, $this->parseSimpleMode($rows, $sheetTitle));
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

        // Build column mapping
        $columnMap = [];
        foreach ($headers as $index => $header) {
            if ($header !== '') {
                $columnMap[$index] = $header;
            }
        }

        // Process data rows
        for ($rowIndex = 1; $rowIndex < count($rows); $rowIndex++) {
            $row = $rows[$rowIndex];
            $productData = [];

            // Map columns to data
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

            if (!$productNameKey) {
                $productNameKey = array_key_first($productData);
            }

            $productName = $productData[$productNameKey] ?? null;

            // Detect description
            $descriptionKey = $this->findDescriptionKey(array_keys($productData));
            $description = $descriptionKey ? ($productData[$descriptionKey] ?? null) : null;

            // Fallback: find long text as description
            if (!$description) {
                foreach ($productData as $value) {
                    if (strlen((string)$value) >= 100) {
                        $description = $value;
                        break;
                    }
                }
            }

            // Remove name and description from details
            if ($productNameKey && isset($productData[$productNameKey])) {
                unset($productData[$productNameKey]);
            }
            if ($descriptionKey && isset($productData[$descriptionKey])) {
                unset($productData[$descriptionKey]);
            }

            // Remove empty values from details
            $productData = array_filter($productData, function ($value) {
                return trim((string)$value) !== '';
            });

            $products[] = [
                'sheet' => $sheetTitle,
                'product_name' => $productName,
                'description' => $description,
                'details' => $productData
            ];
        }

        return $products;
    }

    private function parseSimpleMode($rows, $sheetTitle)
    {
        $products = [];

        foreach ($rows as $row) {
            if (!is_array($row)) continue;

            $values = array_values($row);
            $productName = trim((string)($values[0] ?? ''));
            $description = trim((string)($values[1] ?? ''));

            // Collect other columns as details
            $details = [];
            for ($i = 2; $i < count($values); $i++) {
                $value = trim((string)$values[$i]);
                if ($value !== '') {
                    $details['col_' . ($i + 1)] = $value;
                }
            }

            // Skip if completely empty
            if ($productName === '' && empty($details) && $description === '') {
                continue;
            }

            $products[] = [
                'sheet' => $sheetTitle,
                'product_name' => $productName ?: null,
                'description' => $description ?: null,
                'details' => $details
            ];
        }

        return $products;
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
        $productKeywords = ['product', 'model', 'name', 'sku', 'code', 'title', 'type'];

        foreach ($productKeywords as $keyword) {
            if (strpos($key, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }

    private function findDescriptionKey($keys)
    {
        $descKeywords = ['desc', 'description', 'keterangan', 'note', 'notes'];

        foreach ($keys as $key) {
            foreach ($descKeywords as $keyword) {
                if (preg_match('/\b' . $keyword . '\b/i', $key)) {
                    return $key;
                }
            }
        }

        return null;
    }
}
