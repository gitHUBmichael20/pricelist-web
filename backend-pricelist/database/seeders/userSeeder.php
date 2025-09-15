<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Faker\Factory as Faker;

class UserSeeder extends Seeder
{
    public function run($count = 10, $customData = []): void
    {
        $faker = Faker::create('id_ID');

        $defaultData = [
            'sheet_access' => ['1 series Colorvu', 'Essential', 'Devices'],
            'password' => Hash::make('password'),
        ];

        $data = array_merge($defaultData, $customData);

        for ($i = 0; $i < $count; $i++) {
            User::create([
                'name' => $faker->name,
                'email' => $faker->unique()->safeEmail,
                'sheet_access' => $faker->randomElement($data['sheet_access']),
                'password' => $data['password'],
                'email_verified_at' => $faker->dateTime,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}