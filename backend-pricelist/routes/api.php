<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\adminController;

Route::post('/products', [ProductController::class, 'parseFile']);

Route::prefix('admin')->group(function () {
    Route::post('/login', [adminController::class, 'login']);
});