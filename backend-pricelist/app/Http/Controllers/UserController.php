<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            // Pastikan password gak ikut
            $users = User::all()->makeHidden(['password', 'remember_token']);

            return response()->json([
                'success' => true,
                'data' => $users
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching users:', ['message' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve users'
            ], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users,email',
                'password' => 'required|string|min:6',
                'sheet_access' => 'nullable|string|max:255',
            ]);

            // Jangan pernah log password
            Log::debug('Validated Data:', [
                'name' => $validated['name'],
                'email' => $validated['email'],
                'sheet_access' => $validated['sheet_access'] ?? null,
            ]);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'sheet_access' => $validated['sheet_access'] ?? null,
            ]);

            $user->makeHidden(['password', 'remember_token']);

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'data' => $user,
            ], 201);
        } catch (ValidationException $e) {
            Log::error('Validation Error:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error during user creation:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during user creation',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function login(Request $request)
    {
        try {
            $validated = $request->validate([
                'email' => 'required|email',
                'password' => 'required|string',
            ]);

            // Make sure the user exists in the database
            $user = User::where('email', $validated['email'])->first();

            if (!$user || !Hash::check($validated['password'], $user->password)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid credentials',
                ], 401);
            }

            $user->makeHidden(['password', 'remember_token']);

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data' => $user,
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during login',
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    public function update(Request $request, $id)
    {
        try {
            $validated = $request->validate([
                'sheet_access' => 'required|string|max:255',
            ]);

            $user = User::find($id);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $user->sheet_access = $validated['sheet_access'];
            $user->save();

            $user->makeHidden(['password', 'remember_token']);

            return response()->json([
                'success' => true,
                'message' => 'Sheet access updated successfully',
                'data' => $user
            ], 200);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Update error:', ['message' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during update',
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::find($id);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            Log::error('Delete error:', ['message' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'An error occurred during deletion',
            ], 500);
        }
    }
}
