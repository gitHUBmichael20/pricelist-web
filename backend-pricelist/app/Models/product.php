<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'products';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'sheet',
        'row_index',
        'model',
        'description',
        'harga',
        'harga_num',
        'details',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'row_index' => 'integer',
        'harga_num' => 'decimal:2',
        'details' => 'array', // Cast JSON to array for easier access
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
