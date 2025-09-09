<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ProductController;
use app\Http\Controllers\adminController;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('products')->group(function () {
    Route::get('/read', [ProductController::class, 'getAllData']);
    Route::get('/import', [ProductController::class, 'bacafile']);
});



Route::get('/uploadsemuajson', [ProductController::class, 'uploadsemuajson']);
