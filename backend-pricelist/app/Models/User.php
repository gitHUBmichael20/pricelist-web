<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class user extends Model
{
    //
    protected $fillable = [
        'name',
        'email',
        'sheet_access',
        'password',
        'email_verified_at',
    ];
    protected $hidden = [
        'password',
        'remember_token',
    ];
}
