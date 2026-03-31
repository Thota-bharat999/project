import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useVideos } from '../context/VideoContext'
import { formatFileSize } from '../utils/helpers'
import {
  Video, Upload, CheckCircle, AlertTriangle,
  Clock, XCircle, Eye, HardDrive, ArrowRight
} from 'lucide-react'
import VideoCard from '../components/Video/VideoCard'

const StatCard = ({ icon: Icon, label, value, color = 'text-gray-300', sub }) => (
  <div className="card flex items-start gap-4">
    <div className={`p-2.5 rounded-lg bg-gray-800 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-2xl font-bold text-white">{value ?? '—'}</div>
      <div className="text-sm text-gray-400">{label}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const { videos, stats, loading, fetchVideos, fetchStats, processingMap } = useVideos()

  useEffect(() => {
    fetchStats()
    fetchVideos({ limit: 6, sortBy: 'createdAt', sortOrder: 'desc' })
  }, []) // eslint-disable-line

  // Videos currently processing
  const activeProcessing = videos.filter(
    (v) => v.status === 'processing' || v.status === 'pending'
  )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Here's what's happening with your video library.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Video} label="Total Videos" value={stats?.total ?? 0} color="text-blue-400" />
        <StatCard icon={CheckCircle} label="Safe Content" value={stats?.safe ?? 0} color="text-emerald-400" />
        <StatCard icon={AlertTriangle} label="Flagged Content" value={stats?.flagged ?? 0} color="text-red-400" />
        <StatCard
          icon={HardDrive}
          label="Storage Used"
          value={formatFileSize(stats?.totalSize)}
          color="text-purple-400"
          sub={`${stats?.totalViews ?? 0} total views`}
        />
      </div>

      {/* Processing status */}
      {activeProcessing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Currently Processing ({activeProcessing.length})
          </h2>
          <div className="space-y-2">
            {activeProcessing.map((video) => {
              const live = processingMap[video._id]
              const progress = live?.progress ?? video.processingProgress ?? 0
              const message = live?.message ?? 'Waiting…'
              return (
                <div key={video._id} className="card py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-200 truncate">{video.title}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-4">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1.5">
                    <div
                      className="h-1.5 rounded-full bg-brand-500 progress-active transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{message}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Recent Videos</h2>
          <Link to="/videos" className="text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card h-48 animate-pulse bg-gray-800/50" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="card text-center py-12">
            <Video className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No videos yet.</p>
            <Link to="/upload" className="btn-primary mt-4 inline-flex">
              <Upload className="w-4 h-4" /> Upload your first video
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.slice(0, 6).map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
