"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Mail,
  Calendar,
  Shield,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
} from "lucide-react";
import { BASE_URL } from "@/config/api";

type User = {
  id: number;
  name: string;
  email: string;
  sheet_access?: string | null;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
};

type Sheet = { id: number; name: string };
type Product = {
  sheet: string;
  [key: string]: string | number | null | undefined;
};
type ApiList<T> = { success?: boolean; data: T };
type ToastType = "success" | "error" | "warning";
type NewUserPayload = {
  name: string;
  email: string;
  password: string;
  sheet_access: string;
};
type UpdateUserPayload = { sheet_access: string };

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const api = {
  users: {
    all: async (): Promise<User[]> => {
      const r = await fetch(`${BASE_URL}/api/users/all`);
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as ApiList<User[]>;
      return j.data ?? [];
    },
    add: (body: NewUserPayload) =>
      fetch(`${BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    update: (id: number, body: UpdateUserPayload) =>
      fetch(`${BASE_URL}/api/users/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    del: (id: number) =>
      fetch(`${BASE_URL}/api/users/delete/${id}`, { method: "DELETE" }),
  },
  sheets: async (): Promise<ApiList<Product[]>> => {
    const r = await fetch(`${BASE_URL}/api/products/read?page=1&per_page=10000`);
    if (!r.ok) throw new Error(String(r.status));
    return (await r.json()) as ApiList<Product[]>;
  },
};

function Toast({
  id,
  type,
  message,
  onClose,
}: {
  id: number;
  type: ToastType;
  message: string;
  onClose: (id: number) => void;
}) {
  const base = "flex items-center p-4 rounded-lg shadow-lg border-l-4 min-w-80";
  const tone =
    type === "success"
      ? "bg-green-50 border-green-400 text-green-800"
      : type === "error"
      ? "bg-red-50 border-red-400 text-red-800"
      : "bg-yellow-50 border-yellow-400 text-yellow-800";
  const Icon = type === "success" ? CheckCircle : AlertCircle;
  return (
    <div className={`${base} ${tone}`}>
      <Icon className="h-5 w-5 mr-3" />
      <span className="flex-1">{message}</span>
      <button
        onClick={() => onClose(id)}
        className="ml-2 text-gray-500 hover:text-gray-700"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 pointer-events-none">
      <div className="relative bg-white border border-gray-200 shadow-2xl rounded-xl w-full max-w-lg pointer-events-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && (
          <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toasts, setToasts] = useState<
    { id: number; type: ToastType; message: string }[]
  >([]);
  const [mode, setMode] = useState<null | "add" | "edit" | "delete">(null);
  const [selected, setSelected] = useState<User | null>(null);
  const [form, setForm] = useState<NewUserPayload>({
    name: "",
    email: "",
    password: "",
    sheet_access: "",
  });

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.sheet_access ?? "").toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const addToast = (type: ToastType, message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  const closeModal = () => {
    setMode(null);
    setSelected(null);
    setForm({ name: "", email: "", password: "", sheet_access: "" });
  };

  useEffect(() => {
    (async () => {
      try {
        const [u, s] = await Promise.all([api.users.all(), api.sheets()]);
        setUsers(u);
        const uniq = [...new Set((s.data ?? []).map((p) => p.sheet))]
          .filter(Boolean)
          .sort();
        setSheets(uniq.map((name, i) => ({ id: i + 1, name })));
      } catch {
        addToast("error", "Gagal memuat data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const submitAdd = async () => {
    const { name, email, password, sheet_access } = form;
    if (!name || !email || !password || !sheet_access)
      return addToast("warning", "Lengkapi semua field");
    setAction(true);
    try {
      const r = await api.users.add(form);
      if (!r.ok) throw new Error("failed");
      setUsers(await api.users.all());
      addToast("success", "User ditambahkan");
      closeModal();
    } catch {
      addToast("error", "Gagal menambah user");
    } finally {
      setAction(false);
    }
  };

  const submitEdit = async () => {
    if (!selected || !form.sheet_access)
      return addToast("warning", "Pilih sheet access");
    setAction(true);
    try {
      const r = await api.users.update(selected.id, {
        sheet_access: form.sheet_access,
      });
      if (!r.ok) throw new Error("failed");
      setUsers(await api.users.all());
      addToast("success", "User diperbarui");
      closeModal();
    } catch {
      addToast("error", "Gagal memperbarui user");
    } finally {
      setAction(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    setAction(true);
    try {
      const r = await api.users.del(selected.id);
      if (!r.ok) throw new Error("failed");
      setUsers(await api.users.all());
      addToast("success", "User dihapus");
      closeModal();
    } catch {
      addToast("error", "Gagal menghapus user");
    } finally {
      setAction(false);
    }
  };

  const openAdd = () => {
    setForm({ name: "", email: "", password: "", sheet_access: "" });
    setMode("add");
  };
  const openEdit = (u: User) => {
    setSelected(u);
    setForm((f) => ({ ...f, sheet_access: u.sheet_access ?? "" }));
    setMode("edit");
  };
  const openDelete = (u: User) => {
    setSelected(u);
    setMode("delete");
  };

  const sheetOptions = useMemo(
    () => (
      <>
        <option value="">Pilih sheet access</option>
        {sheets.map((s) => (
          <option key={s.id} value={s.name}>
            {s.name}
          </option>
        ))}
      </>
    ),
    [sheets]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2 text-blue-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg font-medium">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            {...t}
            onClose={(id) => setToasts((x) => x.filter((y) => y.id !== id))}
          />
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                User Management
              </h1>
              <p className="text-sm text-gray-600">
                Manage users and their sheet access permissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Total: {users.length} | Showing: {filteredUsers.length}
            </span>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
            <input
              type="text"
              placeholder="Search users by name, email, or sheet access..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-green-300 bg-green-50 rounded-lg placeholder:text-green-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white bg-red-500 hover:bg-red-600 rounded-full p-1"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? "No users found" : "No users found"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? `No users match "${searchTerm}". Try a different search term.`
                : "Get started by adding a new user."}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sheet Access
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {u.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {u.name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-400" />
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {u.sheet_access ?? "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {fmtDate(u.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded text-blue-600 bg-blue-100 hover:bg-blue-200"
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => openDelete(u)}
                          className="inline-flex items-center px-3 py-1.5 text-xs rounded text-red-600 bg-red-100 hover:bg-red-200"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mode === "add" && (
        <Modal
          title="Add New User"
          onClose={closeModal}
          footer={
            <>
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAdd}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Add User</span>
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="nama@domain.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Minimal 8 karakter"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Sheet Access <span className="text-red-500">*</span>
              </label>
              <select
                value={form.sheet_access}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sheet_access: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-blue-50 text-slate-900 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {sheetOptions}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {mode === "edit" && selected && (
        <Modal
          title="Edit User"
          onClose={closeModal}
          footer={
            <>
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </>
          }
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={selected.name}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={selected.email}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Sheet Access <span className="text-red-500">*</span>
              </label>
              <select
                value={form.sheet_access}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sheet_access: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-blue-50 text-slate-900 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {sheetOptions}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {mode === "delete" && selected && (
        <Modal
          title="Delete User"
          onClose={closeModal}
          footer={
            <>
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Delete User</span>
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-900">
              {selected.name}
            </div>
            <div className="text-sm text-gray-600">{selected.email}</div>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this user? This action cannot be
              undone.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
