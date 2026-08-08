import { getErrorMessage } from '../../utils/error';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createManagedUser, deleteManagedUser, listManagedUsers, updateManagedUser } from '../../routes/api';
import type { ManagedUser, CreateManagedUserPayload, UpdateManagedUserPayload } from '../../routes/api';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  user_type: 'admin' | 'salesman';
}

type RoleFilter = 'all' | 'admin' | 'salesman';

const defaultFormState: FormState = {
  email: '',
  password: '',
  confirmPassword: '',
  user_type: 'salesman',
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<ManagedUser | null>(null);

  const closeForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormState(defaultFormState);
    setFormError(null);
    setIsSubmitting(false);
  };

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filterRole = roleFilter === 'all' ? undefined : roleFilter;
      const data = await listManagedUsers(query.trim(), filterRole);
      setUsers(data);
    } catch (err: unknown) {
      const detail = getErrorMessage(err, 'Failed to load users');
      setError(detail);
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void refreshUsers();
    }, 250);

    return () => clearTimeout(handle);
  }, [refreshUsers]);

  useEffect(() => {
    if (success) {
      const handle = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(handle);
    }
  }, [success]);

  const handleCreateClick = () => {
    setEditingUser(null);
    setFormState(defaultFormState);
    setShowForm(true);
  };

  const handleEditClick = (user: ManagedUser) => {
    setEditingUser(user);
    setFormState({
      email: user.email,
      password: '',
      confirmPassword: '',
      user_type: user.user_type,
    });
    setShowForm(true);
  };

  const validateForm = (): boolean => {
    const trimmedEmail = formState.email.trim().toLowerCase();
    if (!trimmedEmail) {
      setFormError('Email is required');
      return false;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedEmail)) {
      setFormError('Enter a valid email address');
      return false;
    }

    if (!editingUser) {
      if (!formState.password) {
        setFormError('Password is required for new users');
        return false;
      }
      if (formState.password.length < 6) {
        setFormError('Password must be at least 6 characters');
        return false;
      }
    }

    if (formState.password || formState.confirmPassword) {
      if (formState.password.length < 6) {
        setFormError('Password must be at least 6 characters');
        return false;
      }
      if (formState.password !== formState.confirmPassword) {
        setFormError('Passwords do not match');
        return false;
      }
    }

    setFormError(null);
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const payload: UpdateManagedUserPayload = {
          email: formState.email.trim().toLowerCase(),
          user_type: formState.user_type,
        };
        if (formState.password) {
          payload.password = formState.password;
        }

        const updated = await updateManagedUser(editingUser.id, payload);
        setUsers(prev => prev.map(u => (u.id === updated.id ? updated : u)));
        setSuccess('User updated successfully');
      } else {
        const payload: CreateManagedUserPayload = {
          email: formState.email.trim().toLowerCase(),
          password: formState.password,
          user_type: formState.user_type,
        };
        const created = await createManagedUser(payload);
        setUsers(prev => [created, ...prev]);
        setSuccess('User created successfully');
      }
      closeForm();
    } catch (err: unknown) {
      const detail = getErrorMessage(err, 'Failed to save user');
      setFormError(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteManagedUser(deleteCandidate.id);
      setUsers(prev => prev.filter(u => u.id !== deleteCandidate.id));
      setSuccess('User deleted successfully');
      setDeleteCandidate(null);
    } catch (err: unknown) {
      const detail = getErrorMessage(err, 'Failed to delete user');
      setError(detail);
    }
  };

  const totalAdmins = useMemo(() => users.filter(u => u.user_type === 'admin').length, [users]);
  const totalSalesmen = useMemo(() => users.filter(u => u.user_type === 'salesman').length, [users]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 21v-2a3 3 0 0 0-3-3h-1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 8a3 3 0 1 0-6 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            User Management
          </h2>
          <p className="text-gray-600 text-sm">Create, update, and remove system users. Only admins can manage accounts.</p>
        </div>
        <button
          onClick={handleCreateClick}
          className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white shadow hover:bg-blue-700 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path d="M12 5v14" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Add user
        </button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total users</div>
          <div className="text-2xl font-semibold text-gray-900">{users.length}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Admins</div>
          <div className="text-2xl font-semibold text-gray-900">{totalAdmins}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Salesmen</div>
          <div className="text-2xl font-semibold text-gray-900">{totalSalesmen}</div>
        </div>
      </section>

      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-1/2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by email..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <circle cx="11" cy="11" r="7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m20 20-3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'admin', 'salesman'] as RoleFilter[]).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                roleFilter === role ? 'bg-blue-600 text-white shadow' : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="max-h-[480px] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-5 py-6 text-center text-gray-500" colSpan={3}>
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-5 py-6 text-center text-gray-500" colSpan={3}>
                    No users found. Try adjusting your filters or add a new user.
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.user_type === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {user.user_type === 'admin' ? 'Admin' : 'Salesman'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteCandidate(user)}
                          className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => (!isSubmitting ? closeForm() : null)} />
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <header>
                <h3 className="text-xl font-semibold text-gray-900">{editingUser ? 'Edit user' : 'Add new user'}</h3>
                <p className="text-sm text-gray-500">{editingUser ? 'Update the user details below.' : 'Fill in the details to create a new user account.'}</p>
              </header>

              {formError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formState.email}
                  onChange={e => setFormState(s => ({ ...s, email: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="user@example.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Password{editingUser ? ' (optional)' : ''}</label>
                  <input
                    type="password"
                    value={formState.password}
                    onChange={e => setFormState(s => ({ ...s, password: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password{editingUser ? ' (optional)' : ''}</label>
                  <input
                    type="password"
                    value={formState.confirmPassword}
                    onChange={e => setFormState(s => ({ ...s, confirmPassword: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                <div className="flex gap-3">
                  {(['admin', 'salesman'] as Array<'admin' | 'salesman'>).map(role => (
                    <label key={role} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                      formState.user_type === role ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-inner' : 'border-gray-300 text-gray-600'
                    }`}>
                      <input
                        type="radio"
                        name="user-role"
                        value={role}
                        checked={formState.user_type === role}
                        onChange={() => setFormState(s => ({ ...s, user_type: role }))}
                      />
                      {role === 'admin' ? 'Admin' : 'Salesman'}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {editingUser ? 'Save changes' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteCandidate(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete user</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <span className="font-medium">{deleteCandidate.email}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
