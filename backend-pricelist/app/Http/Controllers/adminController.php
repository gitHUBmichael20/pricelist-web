<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\admin;
use Illuminate\Support\Facades\Hash;

class adminController extends Controller
{
    //

    public function login(Request $request)
    {
        $admin = admin::where('email', $request->email)
            ->first();

        if ($admin && Hash::check($request->password, $admin->password)) {
            return response()->json(['message' => 'Login successful', 'admin' => $admin]);
        }

        return response()->json(['message' => 'Invalid credentials'], 401);
    }
}

