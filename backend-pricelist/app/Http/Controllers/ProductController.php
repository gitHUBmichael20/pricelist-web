<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
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

    // In ProductController.php - replace the entire getCategories method
    public function getCategories(Request $request)
    {
        // Get all products grouped by sheet
        $products = Product::all();

        // Group by sheet and format exactly as frontend expects
        $groupedData = $products->groupBy('sheet')->map(function ($items, $sheet) {
            return [
                'sheet' => $sheet,
                'count' => $items->count(),
                'products' => $items->map(function ($product) {
                    // Ensure details is always an array
                    return [
                        'id' => $product->id,
                        'sheet' => $product->sheet,
                        'model' => $product->model,
                        'description' => $product->description,
                        'price' => $product->price,
                        'details' => is_string($product->details)
                            ? json_decode($product->details, true)
                            : ($product->details ?? [])
                    ];
                })->sortBy('model')->values() // Sort and reset keys
            ];
        })->values(); // Reset to indexed array

        return response()->json([
            'success' => true,
            'data' => $groupedData
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
        // Expecting top-level JSON array of products
        $data = $request->validate([
            '*.model'       => 'required|string',
            '*.price'       => 'nullable',      // accept string or number; we coerce below
            '*.description' => 'nullable',      // accept string/array; we normalize below
            '*.sheet'       => 'required|string',
            '*.details'     => 'nullable',      // accept array/string/null; we JSON-encode below
        ]);

        if (empty($data)) {
            return response()->json([
                'success' => false,
                'message' => 'No data provided',
            ], 400);
        }

        // Use the sheet from the first row (as in your original)
        $sheetName = (string) ($data[0]['sheet'] ?? '');

        if ($sheetName === '') {
            return response()->json([
                'success' => false,
                'message' => 'Sheet name is required on the first item',
            ], 422);
        }

        // Prevent duplicate sheet upload
        if (Product::where('sheet', $sheetName)->exists()) {
            return response()->json([
                'success' => false,
                'message' => "Sheet name '{$sheetName}' already exists in database. Please change the sheet name or use the update function.",
                'sheet'   => $sheetName,
            ], 409);
        }

        // Normalize rows for insert
        foreach ($data as $index => &$item) {
            // Required fields are already validated; coerce to safe scalar types
            $item['model'] = (string) $item['model'];
            $item['sheet'] = (string) $item['sheet'];

            // Price: allow numeric or string; coerce to float or null
            if (array_key_exists('price', $item)) {
                if (is_string($item['price'])) {
                    $num = preg_replace('/[^\d\.\-]/', '', $item['price']);
                    $item['price'] = ($num === '' ? null : (float) $num);
                } elseif (is_numeric($item['price'])) {
                    $item['price'] = (float) $item['price'];
                } else {
                    $item['price'] = null;
                }
            } else {
                $item['price'] = null;
            }

            // Description: ensure string or null; if array/object, JSON-encode
            if (array_key_exists('description', $item)) {
                if (is_array($item['description']) || is_object($item['description'])) {
                    $item['description'] = json_encode($item['description'], JSON_UNESCAPED_UNICODE);
                } elseif ($item['description'] === null || $item['description'] === '') {
                    $item['description'] = null;
                } else {
                    $item['description'] = (string) $item['description'];
                }
            } else {
                $item['description'] = null;
            }

            // Details: store as JSON string to avoid "Array to string conversion"
            if (array_key_exists('details', $item)) {
                if (is_array($item['details']) || is_object($item['details'])) {
                    $item['details'] = json_encode($item['details'], JSON_UNESCAPED_UNICODE);
                } elseif ($item['details'] === null || $item['details'] === '') {
                    $item['details'] = json_encode(new \stdClass()); // "{}"
                } else {
                    // assume already-JSON or plain text; cast to string
                    $item['details'] = (string) $item['details'];
                }
            } else {
                $item['details'] = json_encode(new \stdClass());
            }

            // Row order + timestamps
            $item['row_index']  = $index + 1;
            $item['created_at'] = now();
            $item['updated_at'] = now();
        }
        unset($item); // break reference

        try {
            DB::beginTransaction();

            Product::insert($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'sheet'   => $sheetName,
                'inserted_count' => count($data),
                'message' => 'Successfully uploaded ' . count($data) . ' products',
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to upload: ' . $e->getMessage(),
            ], 500);
        }
    }



    public function updateSheet(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sheet' => 'required|string',
            'data' => 'required|array',
            'data.*.model' => 'required|string',
            'data.*.price' => 'nullable|numeric',
            'data.*.description' => 'nullable|string',
            'data.*.sheet' => 'required|string',
            'data.*.details' => 'nullable|array',
        ]);

        $sheetName = $validated['sheet'];
        $data = $validated['data'];

        // Check if sheet exists
        $existingSheet = Product::where('sheet', $sheetName)->exists();

        if (!$existingSheet) {
            return response()->json([
                'success' => false,
                'message' => "Sheet '{$sheetName}' does not exist in database."
            ], 404);
        }

        try {
            DB::beginTransaction();

            // Delete old data
            $deletedCount = Product::where('sheet', $sheetName)->delete();

            // Add row_index and timestamps
            foreach ($data as $index => &$item) {
                $item['row_index'] = $index + 1;
                $item['created_at'] = now();
                $item['updated_at'] = now();

                // Ensure details is a valid JSON string
                if (is_array($item['details'])) {
                    $item['details'] = json_encode($item['details']);  // Ensure it's stored as a JSON string
                }

                // Ensure description is a string (in case it's an array or other type)
                $item['description'] = (string) $item['description'];  // Ensure it's a string
            }

            // Insert new data
            Product::insert($data);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Sheet '{$sheetName}' updated successfully",
                'deleted_count' => $deletedCount,
                'inserted_count' => count($data)
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to update: ' . $e->getMessage()
            ], 500);
        }
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

    public function getExistingSheets(): JsonResponse
    {
        $sheets = Product::select('sheet')->distinct()->orderBy('sheet')->pluck('sheet');

        return response()->json([
            'success' => true,
            'data' => $sheets
        ]);
    }
}
