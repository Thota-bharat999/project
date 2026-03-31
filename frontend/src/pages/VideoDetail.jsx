import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { videoAPI } from '../services/api'
import { getSocket } from '../services/socket'
import { useVideos } from '../context/VideoContext'
import { useAuth } from '../context/AuthContext'
import { formatFileSize, formatDate, formatDuration } from '../utils/helpers'
import {
  Play, Pause, Volume2, VolumeX, Maximize, ArrowLeft,
  CheckCircle, AlertTriangle, Clock, Loader, XCircle,
  Trash2, Edit3, Eye, HardDrive, Calendar, Download
} from 'lucide-react'

const ScoreBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-400">{label}</span>
      <span className={value > 0.4 ? 'text-red-400' : 'text-emerald-400'}>
        {(value * 100).toFixed(1)}%
      </span>
    </div>
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          value > 0.4 ? 'bg-red-500' : 'bg-emerald-500'
        }`}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
)

export default function VideoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { deleteVideo } = useVideos()

  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [liveProgress, setLiveProgress] = useState({ value: 0, message: '' })
  const [videoError, setVideoError] = useState(false)

  const videoRef = useRef()
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await videoAPI.getById(id)
        setVideo(data.data)
        setLiveProgress({ value: data.data.processingProgress || 0, message: '' })
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load video')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    socket.emit('subscribe:video', id)

    const onProgress = (data) => {
      setLiveProgress({ value: data.progress, message: data.message })
      if (data.status === 'completed' || data.status === 'failed') {
        videoAPI.getById(id).then(({ data: res }) => setVideo(res.data)).catch(() => {})
      }
    }
    const onResult = (data) => {
      setVideo((prev) => (prev ? { ...prev, ...data } : prev))
    }

    socket.on(`video:progress:${id}`, onProgress)
    socket.on(`video:result:${id}`, onResult)

    return () => {
      socket.off(`video:progress:${id}`, onProgress)
      socket.off(`video:result:${id}`, onResult)
      socket.emit('unsubscribe:video', id)
    }
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${video.title}"?`)) return
    await deleteVideo(id)
    navigate('/videos')
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    playing ? videoRef.current.pause() : videoRef.current.play()
    setPlaying(!playing)
  }

  const toggleMute = () => {
    if (!videoRef.current) return
    videoRef.current.muted = !muted
    setMuted(!muted)
  }

  const handleSeek = (e) => {
    if (!videoRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    videoRef.current.currentTime = pct * duration
  }

  const handleRetry = () => {
    setVideoError(false)
  }

  const canModify =
    user?.role === 'admin' ||
    video?.owner?._id === user?.id ||
    video?.owner === user?.id

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error || !video) return (
    <div className="p-6 text-center">
      <p className="text-red-400 mb-4">{error || 'Video not found'}</p>
      <Link to="/videos" className="btn-secondary inline-flex">
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </Link>
    </div>
  )

  const progress = liveProgress.value || video.processingProgress || 0
  const streamUrl = videoAPI.getStreamUrl(video._id)
  const supportedMimeTypes = ['video/mp4', 'video/webm', 'video/ogg']
  const isBrowserPlayable = supportedMimeTypes.includes(video.mimetype || '')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        to="/videos"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Player ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-0 overflow-hidden">

            {video.status === 'completed' ? (
              <div className="relative bg-black group">

                {videoError || !isBrowserPlayable ? (
                  /* ── Format error fallback ── */
                  <div className="aspect-video flex flex-col items-center justify-center gap-4 bg-gray-900 px-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-red-900/30 border border-red-700 flex items-center justify-center">
                      <XCircle className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                      <p className="text-red-400 font-semibold mb-1">
                        Video format not supported by your browser
                      </p>
                      <p className="text-gray-500 text-sm">
                        This file may be{' '}
                        <strong className="text-gray-400">.mov / QuickTime</strong> format.
                        Chrome and Firefox cannot play it natively.
                      </p>
                    </div>
                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={() => setVideoError(false)}
                        className="btn-secondary text-sm"
                      >
                        Retry
                      </button>
                      <a
                        href={`${streamUrl}&download=1`}
                        download={video.originalName || video.title}
                        className="btn-primary text-sm"
                      >
                        <Download className="w-4 h-4" /> Download video
                      </a>
                    </div>
                    <p className="text-gray-600 text-xs">
                      Tip: convert to MP4 using HandBrake or VLC for browser playback.
                    </p>
                  </div>

                ) : (
                  <>
                    {/* ✅ src directly on <video> — NOT <source> tags */}
                    {/* Using <source> breaks onError: error fires on <source> */}
                    {/* element which has no .error property */}
                    <video
                      ref={videoRef}
                      key={streamUrl}
                      src={streamUrl}
                      className="w-full aspect-video"
                      preload="metadata"
                      onTimeUpdate={() =>
                        setCurrentTime(videoRef.current?.currentTime || 0)
                      }
                      onLoadedMetadata={() =>
                        setDuration(videoRef.current?.duration || 0)
                      }
                      onPlay={() => setPlaying(true)}
                      onPause={() => setPlaying(false)}
                      onEnded={() => setPlaying(false)}
                      onError={() => {
                        // With src= on <video>, error is on the video element itself
                        const code = videoRef.current?.error?.code
                        const msg = videoRef.current?.error?.message || 'unknown'
                        console.error(`Video error — code: ${code} | message: ${msg}`)
                        setVideoError(true)
                      }}
                    />

                    {/* Controls overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div
                        className="w-full h-1 bg-gray-600 rounded-full mb-3 cursor-pointer"
                        onClick={handleSeek}
                      >
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{
                            width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={togglePlay}
                          className="text-white hover:text-brand-400"
                        >
                          {playing
                            ? <Pause className="w-5 h-5" />
                            : <Play className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-brand-400"
                        >
                          {muted
                            ? <VolumeX className="w-4 h-4" />
                            : <Volume2 className="w-4 h-4" />}
                        </button>
                        <span className="text-xs text-gray-300 flex-1">
                          {formatDuration(currentTime)} / {formatDuration(duration)}
                        </span>
                        <button
                          onClick={() => videoRef.current?.requestFullscreen()}
                          className="text-white hover:text-brand-400"
                        >
                          <Maximize className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

            ) : (
              /* ── Processing / Failed placeholder ── */
              <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center gap-4">
                {video.status === 'failed' ? (
                  <>
                    <XCircle className="w-12 h-12 text-red-500" />
                    <p className="text-red-400">Processing failed</p>
                    <p className="text-gray-500 text-sm">
                      {video.processingError || 'Unknown error'}
                    </p>
                  </>
                ) : (
                  <>
                    <Loader className="w-10 h-10 text-brand-400 animate-spin" />
                    <p className="text-gray-300 font-medium">
                      {video.status === 'pending'
                        ? 'Queued for processing…'
                        : 'Analysing content…'}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {liveProgress.message || 'Please wait'}
                    </p>
                    <div className="w-64">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full">
                        <div
                          className="h-2 bg-brand-500 rounded-full transition-all duration-500 progress-active"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Title & description */}
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white mb-2">{video.title}</h1>
                {video.description && (
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {video.description}
                  </p>
                )}
              </div>
              {canModify && (
                <div className="flex gap-2 flex-shrink-0">
                  <button className="btn-secondary px-3">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-secondary px-3 text-red-400 hover:bg-red-950/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {video.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {video.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 bg-gray-800 text-gray-400 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Sidebar ───────────────────────────────── */}
        <div className="space-y-5">

          {/* Status card */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Processing</span>
                <span className={`badge-${video.status} capitalize flex items-center gap-1`}>
                  {video.status === 'processing' && <Loader className="w-3 h-3 animate-spin" />}
                  {video.status === 'completed'  && <CheckCircle className="w-3 h-3" />}
                  {video.status === 'failed'     && <XCircle className="w-3 h-3" />}
                  {video.status === 'pending'    && <Clock className="w-3 h-3" />}
                  {video.status}
                </span>
              </div>

              {video.status === 'completed' && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Content</span>
                  {video.sensitivityResult === 'safe' ? (
                    <span className="badge-safe">
                      <CheckCircle className="w-3 h-3" /> Safe
                    </span>
                  ) : video.sensitivityResult === 'flagged' ? (
                    <span className="badge-flagged">
                      <AlertTriangle className="w-3 h-3" /> Flagged
                    </span>
                  ) : (
                    <span className="badge-pending">Unknown</span>
                  )}
                </div>
              )}

              {(video.status === 'processing' || video.status === 'pending') && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span><span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full">
                    <div
                      className="h-1.5 bg-brand-500 rounded-full transition-all duration-500 progress-active"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {liveProgress.message && (
                    <p className="text-xs text-gray-600 mt-1">{liveProgress.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sensitivity breakdown */}
          {video.status === 'completed' && video.sensitivityDetails && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">
                Sensitivity Analysis
              </h3>
              <div className="space-y-3">
                <ScoreBar
                  label="Violence"
                  value={video.sensitivityDetails.violence || 0}
                />
                <ScoreBar
                  label="Explicit Content"
                  value={video.sensitivityDetails.explicitContent || 0}
                />
                <ScoreBar
                  label="Hate Speech"
                  value={video.sensitivityDetails.hateSpeech || 0}
                />
                <ScoreBar
                  label="Spam"
                  value={video.sensitivityDetails.spam || 0}
                />
              </div>
              {video.sensitivityScore != null && (
                <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between items-center">
                  <span className="text-xs text-gray-500">Overall score</span>
                  <span
                    className={`text-sm font-bold ${
                      video.sensitivityScore > 0.4
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {(video.sensitivityScore * 100).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* File metadata */}
          <div className="card">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">File Info</h3>
            <div className="space-y-2.5">
              {[
                { icon: HardDrive, label: 'Size',     value: formatFileSize(video.size) },
                { icon: Calendar,  label: 'Uploaded', value: formatDate(video.createdAt) },
                { icon: Eye,       label: 'Views',    value: video.viewCount || 0 },
                { icon: Play,      label: 'Category', value: video.category || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="text-xs text-gray-500 flex-1">{label}</span>
                  <span className="text-xs text-gray-300">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}