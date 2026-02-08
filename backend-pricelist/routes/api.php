<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\adminController;

Route::post('/products', [ProductController::class, 'parseFile']);

Route::prefix('admin')->group(function () {
    Route::post('/login', [adminController::class, 'login']);
    Route::put('/updateprofile/{id}', [adminController::class, 'updateprofile']);
});

Route::prefix('users')->group(function () {
    Route::get('/all', [UserController::class, 'index']);
    Route::post('/register', [UserController::class, 'store']);
    Route::post('/login', [UserController::class, 'login']);
    Route::put('/update/{id}', [UserController::class, 'update']);
    Route::delete('/delete/{id}', [UserController::class, 'destroy']);
});

Route::prefix('products')->group(function () {
    Route::get('/read', [ProductController::class, 'getAllData']);
    Route::get('/categories', [ProductController::class, 'getCategories']);
    Route::get('/search', [ProductController::class, 'search']);
    Route::post('/store', [ProductController::class, 'store']);
    Route::delete('/delete-sheet', [ProductController::class, 'deleteSheet']);
    Route::get('/sheets', [ProductController::class, 'getExistingSheets']);
    Route::put('/update-sheet', [ProductController::class, 'updateSheet']);
});