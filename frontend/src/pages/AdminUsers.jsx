import { useState, useEffect } from 'react'
import { userAPI } from '../services/api'
import { formatDate, getInitials } from '../utils/helpers'
import { Users, Shield, Trash2, Edit3, Search, UserCheck, UserX } from 'lucide-react'

const ROLES = ['viewer', 'editor', 'admin']

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [error, setError] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await userAPI.getAll({ search, limit: 50 })
      setUsers(data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [search]) // eslint-disable-line

  const handleRoleUpdate = async (userId) => {
    try {
      const { data } = await userAPI.update(userId, { role: editRole })
      setUsers((prev) => prev.map((u) => u._id === userId ? data.data : u))
      setEditingId(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role')
    }
  }

  const handleToggleActive = async (user) => {
    try {
      const { data } = await userAPI.update(user._id, { isActive: !user.isActive })
      setUsers((prev) => prev.map((u) => u._id === user._id ? data.data : u))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user')
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return
    try {
      await userAPI.delete(userId)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user')
    }
  }

  const roleColor = (role) => ({
    admin: 'text-purple-400 bg-purple-900/30 border-purple-800',
    editor: 'text-blue-400 bg-blue-900/30 border-blue-800',
    viewer: 'text-gray-400 bg-gray-800 border-gray-700',
  }[role] || '')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Users className="w-6 h-6 text-brand-400" /> User Management
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage user roles and access control.</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-950/40 border border-red-800 rounded-lg text-red-400 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="underline text-xs ml-4">Dismiss</button>
        </div>
      )}

      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          className="input pl-9"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['User', 'Organisation', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-500">No users found</td></tr>
              ) : users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-200">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{user.organisation || '—'}</td>
                  <td className="px-5 py-3">
                    {editingId === user._id ? (
                      <div className="flex items-center gap-2">
                        <select className="input py-1 px-2 text-xs w-28" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={() => handleRoleUpdate(user._id)} className="text-emerald-400 hover:text-emerald-300 text-xs font-medium">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-300 text-xs">Cancel</button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleColor(user.role)}`}>
                        <Shield className="w-3 h-3" /> {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.isActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingId(user._id); setEditRole(user.role) }} className="text-gray-400 hover:text-brand-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleActive(user)} className={`transition-colors ${user.isActive ? 'text-gray-400 hover:text-amber-400' : 'text-gray-500 hover:text-emerald-400'}`}>
                        {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(user._id)} className="text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
