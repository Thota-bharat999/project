import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { Settings, User, Lock, CheckCircle } from 'lucide-react'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', organisation: user?.organisation || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [profileMsg, setProfileMsg] = useState(null)
  const [pwMsg, setPwMsg] = useState(null)
  const [loading, setLoading] = useState({ profile: false, pw: false })

  const handleProfile = async (e) => {
    e.preventDefault()
    setLoading((p) => ({ ...p, profile: true }))
    setProfileMsg(null)
    try {
      const { data } = await authAPI.updateMe(profileForm)
      updateUser(data.user)
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Update failed' })
    } finally {
      setLoading((p) => ({ ...p, profile: false }))
    }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    setLoading((p) => ({ ...p, pw: true }))
    setPwMsg(null)
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      setPwMsg({ type: 'success', text: 'Password changed successfully!' })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.message || 'Password change failed' })
    } finally {
      setLoading((p) => ({ ...p, pw: false }))
    }
  }

  const Alert = ({ msg }) => msg ? (
    <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${msg.type === 'success' ? 'bg-emerald-900/30 border border-emerald-800 text-emerald-400' : 'bg-red-950/40 border border-red-800 text-red-400'}`}>
      {msg.text}
    </div>
  ) : null

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-6 h-6 text-brand-400" /> Settings
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account preferences.</p>
      </div>

      {/* Profile */}
      <div className="card mb-5">
        <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2 mb-5">
          <User className="w-4 h-4 text-brand-400" /> Profile Information
        </h2>
        <Alert msg={profileMsg} />
        <form onSubmit={handleProfile} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              value={profileForm.name}
              onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input opacity-60 cursor-not-allowed" value={user?.email} disabled />
            <p className="text-xs text-gray-600 mt-1">Email cannot be changed.</p>
          </div>
          <div>
            <label className="label">Organisation</label>
            <input
              className="input"
              value={profileForm.organisation}
              onChange={(e) => setProfileForm((p) => ({ ...p, organisation: e.target.value }))}
              placeholder="Your organisation"
            />
          </div>
          <div>
            <label className="label">Role</label>
            <input className="input opacity-60 cursor-not-allowed capitalize" value={user?.role} disabled />
          </div>
          <button type="submit" disabled={loading.profile} className="btn-primary">
            <CheckCircle className="w-4 h-4" />
            {loading.profile ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2 mb-5">
          <Lock className="w-4 h-4 text-brand-400" /> Change Password
        </h2>
        <Alert msg={pwMsg} />
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.currentPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.newPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="Min. 6 characters"
              required
            />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className="input"
              value={pwForm.confirmPassword}
              onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              required
            />
          </div>
          <button type="submit" disabled={loading.pw} className="btn-primary">
            <Lock className="w-4 h-4" />
            {loading.pw ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
