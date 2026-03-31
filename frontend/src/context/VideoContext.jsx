import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { videoAPI } from '../services/api'
import { getSocket } from '../services/socket'
import { useAuth } from './AuthContext'

const VideoContext = createContext(null)

export const VideoProvider = ({ children }) => {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 })
  const [filters, setFilters] = useState({
    page: 1, limit: 12, status: '', sensitivityResult: '', search: '', sortBy: 'createdAt', sortOrder: 'desc'
  })
  // Live progress map: { videoId: { progress, message, status } }
  const [processingMap, setProcessingMap] = useState({})

  // Listen to socket events for real-time updates
  useEffect(() => {
    if (!user) return
    const socket = getSocket()
    if (!socket) return

    const handleProgress = ({ videoId, progress, message, status }) => {
      setProcessingMap((prev) => ({ ...prev, [videoId]: { progress, message, status } }))

      // When a video completes, refresh its entry in the list
      if (status === 'completed' || status === 'failed') {
        setVideos((prev) =>
          prev.map((v) =>
            v._id === videoId
              ? { ...v, status, processingProgress: progress }
              : v
          )
        )
      }
    }

    const handleResult = ({ videoId, status, sensitivityResult, sensitivityScore, sensitivityDetails }) => {
      setVideos((prev) =>
        prev.map((v) =>
          v._id === videoId
            ? { ...v, status, sensitivityResult, sensitivityScore, sensitivityDetails }
            : v
        )
      )
    }

    socket.on('video:update', handleProgress)
    socket.on('video:result', handleResult)

    // Generic handler using wildcard - forward per-video events
    const handleAnyProgress = (event, ...args) => {
      if (event.startsWith('video:progress:')) {
        const videoId = event.split(':')[2]
        handleProgress({ videoId, ...args[0] })
      }
      if (event.startsWith('video:result:')) {
        handleResult({ videoId: event.split(':')[2], ...args[0] })
      }
    }
    socket.onAny(handleAnyProgress)

    return () => {
      socket.off('video:update', handleProgress)
      socket.off('video:result', handleResult)
      socket.offAny(handleAnyProgress)
    }
  }, [user])

  const fetchVideos = useCallback(async (overrideFilters = {}) => {
    setLoading(true)
    try {
      const params = { ...filters, ...overrideFilters }
      // Remove empty strings
      Object.keys(params).forEach((k) => { if (params[k] === '') delete params[k] })
      const { data } = await videoAPI.getAll(params)
      setVideos(data.data)
      setPagination(data.pagination)
    } catch (err) {
      console.error('Failed to fetch videos:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await videoAPI.getStats()
      setStats(data.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const deleteVideo = useCallback(async (id) => {
    await videoAPI.delete(id)
    setVideos((prev) => prev.filter((v) => v._id !== id))
    fetchStats()
  }, [fetchStats])

  const addVideo = useCallback((video) => {
    setVideos((prev) => [video, ...prev])
    fetchStats()
  }, [fetchStats])

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }))
  }, [])

  return (
    <VideoContext.Provider value={{
      videos, stats, loading, pagination, filters,
      processingMap, fetchVideos, fetchStats,
      deleteVideo, addVideo, updateFilters, setFilters,
    }}>
      {children}
    </VideoContext.Provider>
  )
}

export const useVideos = () => {
  const ctx = useContext(VideoContext)
  if (!ctx) throw new Error('useVideos must be used within VideoProvider')
  return ctx
}
