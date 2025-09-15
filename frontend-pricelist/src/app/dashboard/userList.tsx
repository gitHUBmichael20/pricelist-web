"use client";

import { useState, useEffect } from "react";

type User = {
  id: number;
  name: string;
  email: string;
  sheet_access: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modal state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // delete confirmation state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://192.168.1.49:8000/api/users/all");
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        const data: User[] = await res.json();
        setUsers(data);
      } catch (err) {
        setError("Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = async (userId: number) => {
    try {
      setIsDeleting(true);
      const res = await fetch(
        `http://192.168.1.49:8000/api/users/delete/${userId}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      // Remove user from state
      setUsers(users.filter((user) => user.id !== userId));
      setUserToDelete(null);

      // Show success message (optional)
      console.log("User deleted successfully");
    } catch (err) {
      setError("Failed to delete user");
      console.error("Delete error:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">User List</h1>

      <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 font-medium text-gray-700">ID</th>
              <th className="px-6 py-3 font-medium text-gray-700">Name</th>
              <th className="px-6 py-3 font-medium text-gray-700">Email</th>
              <th className="px-6 py-3 font-medium text-gray-700">
                Sheet Access
              </th>
              <th className="px-6 py-3 font-medium text-gray-700">
                Created At
              </th>
              <th className="px-6 py-3 font-medium text-gray-700 text-center">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-900">{user.id}</td>
                <td className="px-6 py-4 text-gray-900 font-medium">
                  {user.name}
                </td>
                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                <td className="px-6 py-4 text-gray-600">{user.sheet_access}</td>
                <td className="px-6 py-4 text-gray-600">
                  {new Date(user.created_at).toLocaleDateString("id-ID")}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setUserToDelete(user)}
                      className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">No users found</div>
      )}

      {/* Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* background blur */}
          <div
            className="absolute inset-0 backdrop-blur-sm backdrop-filter backdrop-glass backdrop-glass bg-opacity-50 rounded-lg"
            onClick={() => setSelectedUser(null)}
          ></div>

          {/* modal content */}
          <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md z-10">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              User Details
            </h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <span className="font-medium">ID:</span> {selectedUser.id}
              </p>
              <p>
                <span className="font-medium">Name:</span> {selectedUser.name}
              </p>
              <p>
                <span className="font-medium">Email:</span> {selectedUser.email}
              </p>
              <p>
                <span className="font-medium">Sheet Access:</span>{" "}
                {selectedUser.sheet_access}
              </p>
              <p>
                <span className="font-medium">Email Verified At:</span>{" "}
                {selectedUser.email_verified_at ?? "Not Verified"}
              </p>
              <p>
                <span className="font-medium">Created At:</span>{" "}
                {new Date(selectedUser.created_at).toLocaleString("id-ID")}
              </p>
              <p>
                <span className="font-medium">Updated At:</span>{" "}
                {new Date(selectedUser.updated_at).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* background blur */}
          <div
            className="absolute inset-0 backdrop-blur-sm backdrop-filter backdrop-glass backdrop-glass bg-opacity-50 rounded-lg"
            onClick={() => !isDeleting && setUserToDelete(null)}
          ></div>

          {/* modal content */}
          <div className="relative bg-white rounded-lg shadow-lg p-6 w-full max-w-md z-10">
            <h2 className="text-xl font-semibold mb-4 text-red-600">
              Confirm Delete
            </h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the user{" "}
              <span className="font-medium">{userToDelete.name}</span>? This
              action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(userToDelete.id)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
