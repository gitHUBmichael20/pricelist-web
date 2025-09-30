<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'sheet',
        'row_index',
        'model',
        'price',
        'description',
        'details',
    ];

    protected $casts = [
        'details' => 'array',
    ];
}
