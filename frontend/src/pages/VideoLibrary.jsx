import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVideos } from '../context/VideoContext'
import VideoCard from '../components/Video/VideoCard'
import { Search, Filter, Upload, ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function VideoLibrary() {
  const { videos, loading, pagination, filters, fetchVideos, updateFilters } = useVideos()
  const [search, setSearch] = useState(filters.search || '')

  useEffect(() => { fetchVideos() }, [filters]) // eslint-disable-line

  const handleSearch = (e) => {
    e.preventDefault()
    updateFilters({ search, page: 1 })
  }

  const clearFilter = (key) => {
    if (key === 'search') setSearch('')
    updateFilters({ [key]: '' })
  }

  const activeFilters = [
    filters.status && { key: 'status', label: `Status: ${filters.status}` },
    filters.sensitivityResult && { key: 'sensitivityResult', label: `Sensitivity: ${filters.sensitivityResult}` },
    filters.search && { key: 'search', label: `Search: "${filters.search}"` },
  ].filter(Boolean)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Library</h1>
          <p className="text-gray-400 text-sm mt-1">{pagination.total} videos</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <Upload className="w-4 h-4" /> Upload Video
        </Link>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-48">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input className="input pl-9" placeholder="Search videos..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-secondary px-3">Search</button>
        </form>
        <select className="input w-auto" value={filters.status} onChange={(e) => updateFilters({ status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
        <select className="input w-auto" value={filters.sensitivityResult} onChange={(e) => updateFilters({ sensitivityResult: e.target.value })}>
          <option value="">All Content</option>
          <option value="safe">Safe Only</option>
          <option value="flagged">Flagged Only</option>
        </select>
        <select className="input w-auto"
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(e) => { const [sortBy, sortOrder] = e.target.value.split(':'); updateFilters({ sortBy, sortOrder }) }}>
          <option value="createdAt:desc">Newest First</option>
          <option value="createdAt:asc">Oldest First</option>
          <option value="title:asc">Title A-Z</option>
          <option value="size:desc">Largest First</option>
          <option value="viewCount:desc">Most Viewed</option>
        </select>
      </div>
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map(({ key, label }) => (
            <button key={key} onClick={() => clearFilter(key)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs rounded-full hover:bg-red-950/30 hover:text-red-400 hover:border-red-800 transition-all">
              {label} <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card h-64 animate-pulse bg-gray-800/50" />)}
        </div>
      ) : videos.length === 0 ? (
        <div className="card text-center py-16">
          <Filter className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No videos found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => <VideoCard key={video._id} video={video} />)}
        </div>
      )}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button disabled={filters.page <= 1} onClick={() => updateFilters({ page: filters.page - 1 })} className="btn-secondary disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-gray-400">Page {pagination.page} of {pagination.pages}</span>
          <button disabled={filters.page >= pagination.pages} onClick={() => updateFilters({ page: filters.page + 1 })} className="btn-secondary disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}
