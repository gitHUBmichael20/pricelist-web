<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function getAllData(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('per_page', 20);
        $page    = (int) $request->get('page', 1);
        $sheet   = $request->get('sheet');
        $search  = $request->get('search');

        $q = Product::query();

        if ($sheet) {
            $q->where('sheet', $sheet);
        }
        if ($search) {
            $q->where(function ($qq) use ($search) {
                $qq->where('model', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $q->orderBy('sheet')->orderBy('row_index')->orderByDesc('id');

        $p = $q->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'data'       => $p->items(),
            'pagination' => [
                'current_page'   => $p->currentPage(),
                'last_page'      => $p->lastPage(),
                'per_page'       => $p->perPage(),
                'total'          => $p->total(),
                'from'           => $p->firstItem(),
                'to'             => $p->lastItem(),
                'has_more_pages' => $p->hasMorePages(),
                'prev_page_url'  => $p->previousPageUrl(),
                'next_page_url'  => $p->nextPageUrl(),
            ],
        ]);
    }

    public function getCategories(Request $request)
    {
        // ambil query param `sheet`
        $sheet = $request->query('sheet');

        if (!$sheet) {
            return response()->json([
                'success' => false,
                'message' => 'Parameter "sheet" is required'
            ], 400);
        }

        // query database
        $products = Product::where('sheet', $sheet)->get();

        if ($products->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => "No products found for sheet '{$sheet}'"
            ], 404);
        }

        return response()->json([
            'success' => true,
            'sheet'   => $sheet,
            'count'   => $products->count(),
            'data'    => $products
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $q       = trim((string) $request->query('q', ''));
        $sheet   = $request->query('sheet');
        $sort    = $request->query('sort', 'relevance'); // relevance | price_asc | price_desc | newest
        $perPage = max(1, min(100, (int) $request->query('per_page', 20)));
        $page    = max(1, (int) $request->query('page', 1));

        if ($q === '') {
            return response()->json([
                'success' => false,
                'message' => 'Query parameter "q" is required (e.g., /products/search?q=chair).',
            ], 422);
        }

        // Tokenize query and escape LIKE wildcards
        $terms = preg_split('/\s+/', $q, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $escapedTerms = array_map(function ($t) {
            $t = str_replace(['%', '_'], ['\%', '\_'], $t);
            return mb_substr($t, 0, 128); // safety clamp
        }, $terms);

        $qb = Product::query();

        if ($sheet) {
            $qb->where('sheet', $sheet);
        }

        // WHERE: all terms must appear in any of the searchable fields
        $qb->where(function ($outer) use ($escapedTerms) {
            foreach ($escapedTerms as $t) {
                $like = "%{$t}%";
                $outer->where(function ($inner) use ($like) {
                    $inner->where('model', 'like', $like)
                        ->orWhere('description', 'like', $like)
                        // If details is JSON (cast to array in model), target common keys:
                        ->orWhere('details->TITLE', 'like', $like)
                        ->orWhere('details->NAME', 'like', $like)
                        ->orWhere('details->MODEL', 'like', $like);
                });
            }
        });

        // Relevance: weight matches in model higher than description/JSON
        // (simple, portable scoring without FULLTEXT requirement)
        if (!empty($escapedTerms)) {
            $fragments = [];
            foreach ($escapedTerms as $t) {
                $fragments[] =
                    " (CASE WHEN model LIKE ? THEN 3 ELSE 0 END)"
                    . "+(CASE WHEN description LIKE ? THEN 1 ELSE 0 END)"
                    . "+(CASE WHEN JSON_EXTRACT(details, '$.TITLE') LIKE ? "
                    .      "OR JSON_EXTRACT(details, '$.NAME') LIKE ? "
                    .      "OR JSON_EXTRACT(details, '$.MODEL') LIKE ? "
                    .  "THEN 1 ELSE 0 END)";
            }
            $scoreSql = '(' . implode(' + ', $fragments) . ') as relevance';
            $bindings = [];
            foreach ($escapedTerms as $t) {
                $like = "%{$t}%";
                // model, description, JSON TITLE, NAME, MODEL
                array_push($bindings, $like, $like, $like, $like, $like);
            }

            $qb->select('*')->selectRaw($scoreSql, $bindings);
        }

        // Sorting
        switch ($sort) {
            case 'price_asc':
                $qb->orderByRaw('price IS NULL')->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $qb->orderByRaw('price IS NULL')->orderBy('price', 'desc');
                break;
            case 'newest':
                $qb->orderByDesc('id');
                break;
            default: // relevance
                // Fall back to sheet + row_index for stability when equal relevance
                $qb->orderByDesc('relevance')
                    ->orderBy('sheet')
                    ->orderBy('row_index')
                    ->orderByDesc('id');
                break;
        }

        $paginator = $qb->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'success'    => true,
            'query'      => $q,
            'sheet'      => $sheet,
            'sort'       => $sort,
            'data'       => $paginator->items(),
            'pagination' => [
                'current_page'   => $paginator->currentPage(),
                'last_page'      => $paginator->lastPage(),
                'per_page'       => $paginator->perPage(),
                'total'          => $paginator->total(),
                'from'           => $paginator->firstItem(),
                'to'             => $paginator->lastItem(),
                'has_more_pages' => $paginator->hasMorePages(),
                'prev_page_url'  => $paginator->previousPageUrl(),
                'next_page_url'  => $paginator->nextPageUrl(),
            ],
        ]);
    }

    // Method to handle data upload
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            '*.model' => 'required|string',
            '*.price' => 'nullable|numeric',
            '*.description' => 'nullable|string',
            '*.sheet' => 'required|string',
            '*.details' => 'nullable|array',
        ]);

        $products = Product::insert($data);

        return response()->json(['success' => true, 'data' => $products], 201);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            '*.model' => 'required|string',
            '*.price' => 'nullable|numeric',
            '*.description' => 'nullable|string',
            '*.sheet' => 'required|string',
            '*.details' => 'nullable|array',
        ]);

        // Here you can either update by sheet or model, depending on your use case
        foreach ($data as $productData) {
            Product::updateOrCreate(
                ['sheet' => $productData['sheet'], 'model' => $productData['model']], // criteria for updating
                $productData // the data to update
            );
        }

        return response()->json(['success' => true, 'message' => 'Products updated successfully'], 200);
    }

    public function deleteSheet(Request $request): JsonResponse
    {
        $sheet = $request->input('sheet');

        if (!$sheet) {
            return response()->json([
                'success' => false,
                'message' => 'Sheet name is required'
            ], 400);
        }

        $deleted = Product::where('sheet', $sheet)->delete();

        return response()->json([
            'success' => true,
            'message' => "Deleted {$deleted} records from sheet '{$sheet}'"
        ]);
    }
}

// public function uploadsemuajson(Request $request): JsonResponse
// {
//     // Pakai path absolute kamu:
//     $path = 'D:\work\pricelist\backend-pricelist\storage\app\public\products_refined.json';

//     // Alternatif kalau mau pakai Storage (pastikan disk 'public' benar):
//     // $path = \Storage::disk('public')->path('products_refined.json');

//     if (!file_exists($path)) {
//         return response()->json([
//             'ok'      => false,
//             'message' => "File tidak ditemukan di $path",
//         ], 404);
//     }

//     $raw  = file_get_contents($path);
//     $data = json_decode($raw, true);

//     if (!is_array($data)) {
//         return response()->json([
//             'ok'      => false,
//             'message' => 'Format JSON tidak valid atau bukan array root.',
//         ], 422);
//     }

//     $perSheetCounter = [];
//     $processed = 0;
//     $errors = [];
//     $created = 0;
//     $updated = 0;

//     foreach ($data as $idx => $item) {
//         try {
//             $sheet = $item['sheet'] ?? 'Unknown';
//             $perSheetCounter[$sheet] = ($perSheetCounter[$sheet] ?? 0) + 1;
//             $rowIndex = $perSheetCounter[$sheet];

//             $details      = is_array($item['details'] ?? null) ? $item['details'] : [];
//             $fallbackName = $item['nama_kode_model_produk'] ?? null;
//             $model        = trim($this->extractModelName($details, $fallbackName));
//             if ($model === '') {
//                 $model = $fallbackName ? trim($fallbackName) : 'Unknown';
//             }

//             // --- Harga: urutan prioritas ---
//             $price = null;

//             // 1) harga_produk (numeric)
//             if ($price === null && isset($item['harga_produk'])) {
//                 $price = $this->parsePriceInt($item['harga_produk']);
//             }

//             // 2) details.PARTNER PRICE
//             if ($price === null && isset($details['PARTNER PRICE'])) {
//                 $price = $this->parsePriceInt($details['PARTNER PRICE']);
//             }

//             // 3) details.BOTTOM PRICE
//             if ($price === null && isset($details['BOTTOM PRICE'])) {
//                 $price = $this->parsePriceInt($details['BOTTOM PRICE']);
//             }

//             // 4) details.MSRP (sebagai fallback terakhir sebelum harga_raw)
//             if ($price === null && isset($details['MSRP'])) {
//                 $price = $this->parsePriceInt($details['MSRP']);
//             }

//             // 5) harga_raw
//             if ($price === null && isset($item['harga_raw'])) {
//                 $price = $this->parsePriceInt($item['harga_raw']);
//             }

//             // updateOrCreate by (sheet, model)
//             $values = [
//                 'row_index'   => $rowIndex,
//                 'description' => $item['deskripsi'] ?? null,
//                 'price'       => $price,
//                 'details'     => $details,
//             ];

//             $existing = Product::where('sheet', $sheet)->where('model', $model)->first();
//             if ($existing) {
//                 $existing->update($values);
//                 $updated++;
//             } else {
//                 Product::create(array_merge([
//                     'sheet' => $sheet,
//                     'model' => $model,
//                 ], $values));
//                 $created++;
//             }

//             $processed++;
//         } catch (\Throwable $e) {
//             $errors[] = [
//                 'index'   => $idx,
//                 'sheet'   => $item['sheet'] ?? null,
//                 'rawName' => $item['nama_kode_model_produk'] ?? null,
//                 'error'   => $e->getMessage(),
//             ];
//         }
//     }

//     return response()->json([
//         'ok'              => true,
//         'message'         => 'Import selesai.',
//         'path_used'       => $path,
//         'total_processed' => $processed,
//         'created'         => $created,
//         'updated'         => $updated,
//         'by_sheet'        => $perSheetCounter,
//         'errors'          => $errors,
//     ]);
// }

// /**
//  * Ambil nama model dari details (ORDER MODEL, MODEL, TYPE, PART, PART NUMBER, TITLE, NAME).
//  * fallback ke nama_kode_model_produk jika tidak ada.
//  */
// private function extractModelName(array $details, ?string $fallbackName): string
// {
//     $normalized = [];
//     foreach ($details as $k => $v) {
//         $normalized[mb_strtoupper(trim((string) $k))] = is_string($v) ? trim($v) : $v;
//     }

//     $candidates = [
//         'ORDER MODEL',
//         'MODEL',
//         'TYPE',
//         'PART',
//         'PART NUMBER',
//         'TITLE',
//         'NAME',
//     ];

//     foreach ($candidates as $key) {
//         if (!empty($normalized[$key]) && is_string($normalized[$key])) {
//             return $normalized[$key];
//         }
//     }

//     return $fallbackName ? trim($fallbackName) : 'Unknown';
// }

// /**
//  * Normalisasi harga ke integer (rupiah):
//  * - Menerima int/float/string
//  * - Menghapus simbol (Rp, IDR), spasi, koma/titik pemisah
//  * - "123.456.789" -> 123456789, "47,080,000" -> 47080000
//  */
// private function parsePriceInt($value): ?int
// {
//     if ($value === null) {
//         return null;
//     }

//     // Jika sudah numeric "bersih"
//     if (is_int($value)) {
//         return $value;
//     }
//     if (is_float($value)) {
//         return (int) round($value);
//     }

//     // String: buang semua karakter non-digit
//     if (is_string($value)) {
//         // hilangkan Rp, IDR, spasi
//         $clean = preg_replace('/[^\d]/', '', $value);
//         if ($clean === '' || $clean === null) {
//             return null;
//         }
//         // Hindari integer overflow tidak realistis (opsional)
//         // Misal panjang > 12 digit dianggap tidak valid
//         if (strlen($clean) > 12) {
//             return null;
//         }
//         return (int) $clean;
//     }

//     return null;
// }
