"use client";
import { useRouter } from 'next/navigation';

export default function Account() {
  const router = useRouter();

  return (
    <div className="text-center">
      <h1 className="text-5xl font-bold mb-4">Account Settings</h1>
      <button
        onClick={() => router.push('/login')}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 shadow-md"
      >
        Go to Login
      </button>
    </div>
  );
}