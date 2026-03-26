import { useState, useEffect } from 'react'
import axios from 'axios'

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: boolean
  refetch: () => void
}

export function useFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<{ data: T }>,
  deps: any[] = []
): UseFetchResult<T> {
  const [data, setData]       = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [tick, setTick]       = useState(0)

  const refetch = () => setTick(t => t + 1)

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    setLoading(true)
    setError(false)

    fetcher(controller.signal)
      .then(res => {
        if (!cancelled) setData(res.data)
      })
      .catch(err => {
        if (axios.isCancel(err)) return
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [...deps, tick])

  return { data, loading, error, refetch }
}
