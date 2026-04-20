'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Wallet, Trash2, UserPlus, Eye, EyeOff } from 'lucide-react';
import api from '../../../lib/api';

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
      status === 'ACTIVE'
        ? 'bg-green-100 text-green-700 border-green-200'
        : 'bg-red-100 text-red-700 border-red-200'
    }`}>
      {status}
    </span>
  );
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  wallet?: { balance: number };
}

type ConfirmAction =
  | { type: 'suspend';    userId: string; name: string }
  | { type: 'reactivate'; userId: string; name: string }
  | { type: 'delete';     userId: string; name: string }
  | { type: 'fund';       userId: string; name: string };

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'USER' };

export default function AdminUsersPage() {
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundNote, setFundNote]     = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [addForm, setAddForm]         = useState(emptyForm);
  const [addError, setAddError]       = useState('');
  const [showAddPwd, setShowAddPwd]   = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      return api.get(`/admin/users?${params}`).then((r) => r.data.data);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      api.patch(`/admin/users/${userId}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setConfirm(null); },
  });

  const deleteUser = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/users/${userId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); setConfirm(null); },
  });

  const fundUser = useMutation({
    mutationFn: ({ userId, amount, description }: { userId: string; amount: number; description: string }) =>
      api.post(`/admin/users/${userId}/fund`, { amount, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirm(null);
      setFundAmount('');
      setFundNote('');
    },
  });

  const createUser = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      api.post('/admin/users', { ...data, role: data.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowAddUser(false);
      setAddForm(emptyForm);
      setAddError('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddError(msg || 'Failed to create user.');
    },
  });

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'suspend')    updateStatus.mutate({ userId: confirm.userId, status: 'SUSPENDED' });
    if (confirm.type === 'reactivate') updateStatus.mutate({ userId: confirm.userId, status: 'ACTIVE' });
    if (confirm.type === 'delete')     deleteUser.mutate(confirm.userId);
    if (confirm.type === 'fund') {
      const amount = parseFloat(fundAmount);
      if (!amount || amount <= 0) return;
      fundUser.mutate({ userId: confirm.userId, amount, description: fundNote || `Admin funding` });
    }
  };

  const isPending = updateStatus.isPending || deleteUser.isPending || fundUser.isPending;

  const users: User[] = data?.users || [];
  const total = data?.total || 0;
  const pages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">View and manage registered users.</p>
        </div>
        <button
          onClick={() => { setShowAddUser(true); setAddError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a]"
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-slate-100 rounded-lg"><UserPlus size={18} className="text-[#C9A84C]" /></div>
              <h3 className="font-semibold text-slate-900 text-lg">Add New User</h3>
            </div>

            {addError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {addError}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                  <input
                    type="text"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm((f) => ({ ...f, firstName: e.target.value }))}
                    placeholder="John"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm((f) => ({ ...f, lastName: e.target.value }))}
                    placeholder="Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="08012345678"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showAddPwd ? 'text' : 'password'}
                    value={addForm.password}
                    onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button type="button" onClick={() => setShowAddPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showAddPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowAddUser(false); setAddForm(emptyForm); setAddError(''); }}
                className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => createUser.mutate(addForm)}
                disabled={createUser.isPending || !addForm.firstName || !addForm.lastName || !addForm.email || !addForm.password}
                className="flex-1 py-2 bg-[#0D2137] text-white rounded-lg text-sm font-medium hover:bg-[#0f2d4a] disabled:opacity-60"
              >
                {createUser.isPending ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation / Fund Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            {confirm.type === 'fund' ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg"><Wallet size={18} className="text-green-600" /></div>
                  <h3 className="font-semibold text-slate-900">Fund Wallet</h3>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Credit <span className="font-medium text-slate-700">{confirm.name}</span>'s wallet.
                </p>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₦)</label>
                    <input
                      type="number"
                      min="1"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Note (optional)</label>
                    <input
                      type="text"
                      value={fundNote}
                      onChange={(e) => setFundNote(e.target.value)}
                      placeholder="Reason for funding..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {confirm.type === 'suspend'    && 'Suspend User?'}
                  {confirm.type === 'reactivate' && 'Reactivate User?'}
                  {confirm.type === 'delete'     && 'Delete User?'}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {confirm.type === 'suspend'    && `${confirm.name} will no longer be able to log in.`}
                  {confirm.type === 'reactivate' && `${confirm.name} will regain access to the platform.`}
                  {confirm.type === 'delete'     && `This will permanently delete ${confirm.name} and all their data. This cannot be undone.`}
                </p>
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setConfirm(null); setFundAmount(''); setFundNote(''); }}
                className="flex-1 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending || (confirm.type === 'fund' && !fundAmount)}
                className={`flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-60 ${
                  confirm.type === 'delete'     ? 'bg-red-600 hover:bg-red-700' :
                  confirm.type === 'suspend'    ? 'bg-orange-500 hover:bg-orange-600' :
                  confirm.type === 'reactivate' ? 'bg-green-600 hover:bg-green-700' :
                  'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isPending ? 'Processing...' :
                  confirm.type === 'fund'       ? 'Fund Wallet' :
                  confirm.type === 'suspend'    ? 'Suspend' :
                  confirm.type === 'reactivate' ? 'Reactivate' :
                  'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D2137]" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-300 p-12 text-center text-slate-400">
          <Users size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No users found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-300 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden md:table-cell">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase hidden lg:table-cell">Joined</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{user.firstName} {user.lastName}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{user.email}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                    ₦{Number(user.wallet?.balance ?? 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Fund */}
                      <button
                        onClick={() => setConfirm({ type: 'fund', userId: user.id, name: `${user.firstName} ${user.lastName}` })}
                        className="text-xs text-green-600 hover:underline font-medium flex items-center gap-1"
                        title="Fund wallet"
                      >
                        <Wallet size={13} /> Fund
                      </button>

                      {/* Suspend / Reactivate */}
                      {user.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setConfirm({ type: 'suspend', userId: user.id, name: `${user.firstName} ${user.lastName}` })}
                          className="text-xs text-orange-500 hover:underline font-medium"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirm({ type: 'reactivate', userId: user.id, name: `${user.firstName} ${user.lastName}` })}
                          className="text-xs text-[#C9A84C] hover:underline font-medium"
                        >
                          Reactivate
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => setConfirm({ type: 'delete', userId: user.id, name: `${user.firstName} ${user.lastName}` })}
                        className="text-xs text-red-500 hover:underline font-medium flex items-center gap-1"
                        title="Delete user"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-300">
              <p className="text-sm text-slate-500">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                  Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                  className="px-3 py-1 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
