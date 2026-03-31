import { Link } from 'react-router-dom'
import { useVideos } from '../../context/VideoContext'
import { formatFileSize, formatDate, truncate } from '../../utils/helpers'
import { Play, Trash2, Clock, CheckCircle, AlertTriangle, XCircle, Loader } from 'lucide-react'

const StatusIcon = ({ status }) => {
  const map = {
    pending: <Clock className="w-3.5 h-3.5" />,
    processing: <Loader className="w-3.5 h-3.5 animate-spin" />,
    completed: <CheckCircle className="w-3.5 h-3.5" />,
    failed: <XCircle className="w-3.5 h-3.5" />,
  }
  return map[status] || null
}

const SensitivityBadge = ({ result }) => {
  if (!result || result === 'unknown') return null
  return result === 'safe'
    ? <span className="badge-safe"><CheckCircle className="w-3 h-3" /> Safe</span>
    : <span className="badge-flagged"><AlertTriangle className="w-3 h-3" /> Flagged</span>
}

export default function VideoCard({ video }) {
  const { deleteVideo, processingMap } = useVideos()
  const live = processingMap[video._id]
  const progress = live?.progress ?? video.processingProgress ?? 0

  const handleDelete = async (e) => {
    e.preventDefault()
    if (window.confirm(`Delete "${video.title}"?`)) {
      await deleteVideo(video._id)
    }
  }

  return (
    <div className="card group hover:border-gray-700 transition-all duration-200 flex flex-col">
      {/* Thumbnail / placeholder */}
      <div className="relative w-full aspect-video bg-gray-800 rounded-lg mb-3 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="w-10 h-10 text-gray-600" />
        </div>

        {/* Processing overlay */}
        {(video.status === 'processing' || video.status === 'pending') && (
          <div className="absolute inset-0 bg-gray-900/80 flex flex-col items-center justify-center">
            <Loader className="w-6 h-6 text-brand-400 animate-spin mb-2" />
            <span className="text-xs text-gray-300">{progress}%</span>
            <div className="w-24 h-1 bg-gray-700 rounded-full mt-2">
              <div
                className="h-1 bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Sensitivity badge overlay */}
        {video.status === 'completed' && (
          <div className="absolute top-2 right-2">
            <SensitivityBadge result={video.sensitivityResult} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1">
        <h3 className="font-medium text-gray-100 text-sm mb-1 truncate" title={video.title}>
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-gray-500 mb-2">{truncate(video.description, 60)}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span>{formatFileSize(video.size)}</span>
          <span>·</span>
          <span>{formatDate(video.createdAt)}</span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 text-xs capitalize">
          <StatusIcon status={video.status} />
          <span className={
            video.status === 'completed' ? 'text-emerald-400'
            : video.status === 'failed' ? 'text-red-400'
            : video.status === 'processing' ? 'text-amber-400'
            : 'text-gray-500'
          }>{video.status}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
        {video.status === 'completed' ? (
          <Link to={`/videos/${video._id}`} className="btn-primary flex-1 justify-center text-sm py-1.5">
            <Play className="w-3.5 h-3.5" /> Watch
          </Link>
        ) : (
          <Link to={`/videos/${video._id}`} className="btn-secondary flex-1 justify-center text-sm py-1.5">
            Details
          </Link>
        )}
        <button onClick={handleDelete} className="btn-secondary px-3 text-red-400 hover:bg-red-950/30">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
