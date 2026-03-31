import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { videoAPI } from '../services/api'
import { useVideos } from '../context/VideoContext'
import { formatFileSize } from '../utils/helpers'
import { Upload, Film, X, CheckCircle, AlertCircle } from 'lucide-react'

const ACCEPTED = ['video/mp4','video/mpeg','video/quicktime','video/x-msvideo','video/webm','video/x-matroska']

export default function UploadPage() {
  const navigate = useNavigate()
  const { addVideo } = useVideos()
  const fileInputRef = useRef()
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: 'Uncategorized', tags: '' })
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleFile = (f) => {
    if (!f) return
    if (!ACCEPTED.includes(f.type)) { setError('Invalid file type. Upload MP4, MOV, AVI, WebM, or MKV.'); return }
    if (f.size > 500 * 1024 * 1024) { setError('File too large. Maximum size is 500MB.'); return }
    setError('')
    setFile(f)
    if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') }))
  }

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }, []) // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault()
    if (!file) { setError('Please select a video file.'); return }
    if (!form.title.trim()) { setError('Title is required.'); return }
    setError('')
    setUploading(true)
    setUploadProgress(0)
    const formData = new FormData()
    formData.append('video', file)
    formData.append('title', form.title)
    formData.append('description', form.description)
    formData.append('category', form.category)
    if (form.tags) formData.append('tags', form.tags)
    try {
      const { data } = await videoAPI.upload(formData, (evt) => {
        setUploadProgress(Math.round((evt.loaded / evt.total) * 100))
      })
      addVideo(data.video)
      setSuccess(true)
      setTimeout(() => navigate('/videos'), 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  if (success) return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-16 h-16 rounded-full bg-emerald-900/30 border border-emerald-700 flex items-center justify-center mb-4">
        <CheckCircle className="w-8 h-8 text-emerald-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Upload Successful!</h2>
      <p className="text-gray-400 text-center">Sensitivity analysis started. Redirecting to library...</p>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white">Upload Video</h1>
        <p className="text-gray-400 mt-1 text-sm">Upload a video for sensitivity analysis and streaming.</p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <div
          onClick={() => !file && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragOver ? 'drag-over border-brand-500' : 'border-gray-700 hover:border-gray-600'} ${!file ? 'cursor-pointer' : ''}`}
        >
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          {file ? (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                <Film className="w-6 h-6 text-brand-400" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-medium text-gray-200 truncate">{file.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
              </div>
              {!uploading && (
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-gray-500 hover:text-red-400">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-300 font-medium">Drop your video here</p>
              <p className="text-gray-500 text-sm mt-1">or click to browse</p>
              <p className="text-gray-600 text-xs mt-3">MP4, MOV, AVI, WebM, MKV - Max 500MB</p>
            </>
          )}
        </div>

        {uploading && (
          <div className="card">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">{uploadProgress < 100 ? 'Uploading...' : 'Processing started'}</span>
              <span className="text-brand-400 font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div className="h-2 rounded-full bg-brand-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {file && !uploading && (
          <div className="card space-y-4">
            <h2 className="font-semibold text-gray-200">Video Details</h2>
            <div>
              <label className="label">Title <span className="text-red-400">*</span></label>
              <input className="input" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter video title" required />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                  {['Uncategorized','Training','Marketing','Education','Entertainment','Tutorial','News','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tags <span className="text-gray-500 font-normal">(comma-separated)</span></label>
                <input className="input" value={form.tags} onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="react, tutorial" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-950/40 border border-red-800 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        {file && !uploading && (
          <button type="submit" className="btn-primary w-full justify-center py-3">
            <Upload className="w-4 h-4" /> Upload & Analyse
          </button>
        )}
      </form>
    </div>
  )
}
