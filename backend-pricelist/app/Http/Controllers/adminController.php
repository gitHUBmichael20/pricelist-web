<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\admin;
use Illuminate\Support\Facades\Log;
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

    public function updateprofile(Request $request, $id)
    {
        Log::info('Received data:', $request->all());
        $admin = admin::find($id);
        if (!$admin) {
            return response()->json(['message' => 'Admin not found'], 404);
        }

        $admin->name = $request->name ?? $admin->name;
        $admin->email = $request->email ?? $admin->email;

        if ($request->password) {
            $admin->password = Hash::make($request->password);
        }

        if ($admin->save()) {
            Log::info('Profile updated:', $admin->toArray());
            return response()->json(['message' => 'Profile updated successfully', 'admin' => $admin]);
        } else {
            Log::error('Failed to save admin:', $admin->getErrors());
            return response()->json(['message' => 'Failed to update profile'], 500);
        }
    }
}
