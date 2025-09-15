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

    public function uploadsemuajson()
    {
        // Path file JSON
        $path = storage_path('app/public/output-final.json');

        // Cek apakah file ada
        if (!file_exists($path)) {
            return response()->json([
                'status' => 'error',
                'message' => 'File JSON tidak ditemukan di: ' . $path
            ], 404);
        }

        // Baca isi file JSON
        $jsonContent = file_get_contents($path);
        $data = json_decode($jsonContent, true);

        if ($data === null || !isset($data['products'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Format JSON tidak sesuai'
            ], 400);
        }

        $count = 0;

        foreach ($data['products'] as $product) {
            Product::create([
                'sheet'      => $product['sheet'] ?? null,
                'row_index'  => $product['row_index'] ?? null,
                'model'      => $product['name'] ?? null,   // name di JSON → model di DB
                'description' => $product['description'] ?? null,
                'details'    => isset($product['details']) ? json_encode($product['details']) : null,
            ]);
            $count++;
        }

        return response()->json([
            'status' => 'success',
            'message' => "Berhasil upload {$count} produk dari JSON"
        ]);
    }
}
