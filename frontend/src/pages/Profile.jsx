import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { getInitials } from '../utils/helpers'
import { User, Lock, Shield, Building2, Save, CheckCircle, AlertCircle } from 'lucide-react'

const ROLE_INFO = {
  admin:  { color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/20', desc: 'Full system access including user management' },
  editor: { color: 'text-brand-400',  bg: 'bg-brand-500/15 border-brand-500/20',   desc: 'Upload, edit and manage video content' },
  viewer: { color: 'text-gray-400',   bg: 'bg-gray-700/40 border-gray-600/20',     desc: 'Read-only access to assigned videos' },
}

const Alert = ({ type, message }) => (
  <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${
    type === 'success'
      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-400'
      : 'bg-red-950/40 border-red-800/50 text-red-400'
  }`}>
    {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
    {message}
  </div>
)

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', organisation: user?.organisation || '' })
  const [profileMsg, setProfileMsg] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwMsg, setPwMsg] = useState(null)
  const [pwSaving, setPwSaving] = useState(false)

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg(null)
    try {
      const { data } = await authAPI.updateMe(profileForm)
      updateUser(data.user)
      setProfileMsg({ type: 'success', message: 'Profile updated successfully.' })
    } catch (err) {
      setProfileMsg({ type: 'error', message: err.response?.data?.message || 'Failed to update profile' })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', message: 'Password must be at least 6 characters.' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwMsg({ type: 'success', message: 'Password changed successfully.' })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwMsg({ type: 'error', message: err.response?.data?.message || 'Failed to change password' })
    } finally {
      setPwSaving(false)
    }
  }

  const role = ROLE_INFO[user?.role] || ROLE_INFO.viewer

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Profile & Settings</h1>

      {/* Avatar + role */}
      <div className="card mb-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-2xl font-bold text-brand-400">
          {getInitials(user?.name)}
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{user?.name}</div>
          <div className="text-sm text-gray-400 mb-2">{user?.email}</div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${role.bg} ${role.color}`}>
            <Shield className="w-3 h-3" />
            {user?.role} · {role.desc}
          </span>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleProfileSave} className="card mb-5 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-brand-400" /> Personal Information
        </h2>

        {profileMsg && <Alert {...profileMsg} />}

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Full name</label>
          <input
            className="input"
            value={profileForm.name}
            onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Organisation
          </label>
          <input
            className="input"
            value={profileForm.organisation}
            onChange={e => setProfileForm(p => ({ ...p, organisation: e.target.value }))}
            placeholder="Organisation name"
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Email</label>
          <input className="input opacity-50" value={user?.email} disabled />
          <p className="text-xs text-gray-600 mt-1">Email cannot be changed.</p>
        </div>

        <button type="submit" disabled={profileSaving} className="btn-primary">
          <Save className="w-4 h-4" />
          {profileSaving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Password form */}
      <form onSubmit={handlePasswordChange} className="card space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-400" /> Change Password
        </h2>

        {pwMsg && <Alert {...pwMsg} />}

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Current password</label>
          <input
            type="password"
            className="input"
            value={pwForm.currentPassword}
            onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">New password</label>
          <input
            type="password"
            className="input"
            value={pwForm.newPassword}
            onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
            minLength={6}
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-1.5 block">Confirm new password</label>
          <input
            type="password"
            className="input"
            value={pwForm.confirmPassword}
            onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
            required
          />
        </div>

        <button type="submit" disabled={pwSaving} className="btn-primary">
          <Lock className="w-4 h-4" />
          {pwSaving ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </div>
  )
}
