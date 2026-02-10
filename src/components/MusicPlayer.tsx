import { useEffect, useMemo, useRef, useState } from 'react'
import { playlists } from '../data/playlists'

type Track = {
  id: string
  title: string
  src: string
}

type PlayerState = {
  playlistId: string
  trackIndex: number
}

const STORAGE_KEY = 'codex-player-state'
const VOLUME_KEY = 'codex-player-volume'
const DEFAULT_VOLUME = 0.15

const getStoredState = (): PlayerState | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PlayerState
  } catch {
    return null
  }
}

const storeState = (state: PlayerState) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const getStoredVolume = () => {
  if (typeof window === 'undefined') return DEFAULT_VOLUME
  const raw = window.localStorage.getItem(VOLUME_KEY)
  if (!raw) return DEFAULT_VOLUME
  const parsed = Number.parseFloat(raw)
  if (Number.isNaN(parsed)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, parsed))
}

const storeVolume = (value: number) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VOLUME_KEY, value.toFixed(2))
}

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const buildTracks = (basePath: string, files: string[], prefix: string) => {
  const encodedBase = encodeURI(basePath)
  return files.map((file, index) => {
    const decoded = safeDecode(file)
    const title = decoded.replace(/\.[^/.]+$/, '')
    return {
      id: `${prefix}-${index}`,
      title,
      src: `${encodedBase}/${file}`,
    }
  })
}

export function MusicPlayer() {
  const stored = getStoredState()
  const defaultPlaylistId = playlists[0]?.id ?? ''
  const [playlistId, setPlaylistId] = useState(
    stored?.playlistId ?? defaultPlaylistId,
  )
  const [trackIndex, setTrackIndex] = useState(stored?.trackIndex ?? 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(getStoredVolume)
  const [showVolume, setShowVolume] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const volumePopoverRef = useRef<HTMLDivElement | null>(null)
  const playlistPopoverRef = useRef<HTMLDivElement | null>(null)

  const playlist = useMemo(() => {
    return playlists.find((item) => item.id === playlistId) ?? playlists[0]
  }, [playlistId])

  const tracks: Track[] = useMemo(() => {
    if (!playlist) return []
    return buildTracks(playlist.basePath, playlist.files, playlist.id)
  }, [playlist])

  const currentTrack = tracks[trackIndex]

  useEffect(() => {
    storeState({ playlistId, trackIndex })
  }, [playlistId, trackIndex])

  useEffect(() => {
    if (tracks.length === 0) return
    if (trackIndex >= tracks.length) {
      setTrackIndex(0)
    }
  }, [tracks, trackIndex])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = volume
    audioRef.current = audio

    return () => {
      audio.pause()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src = currentTrack.src
    audio.load()
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false)
      })
    }
  }, [currentTrack?.src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    storeVolume(volume)
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || tracks.length === 0) return

    const handleEnded = () => {
      setTrackIndex((current) => {
        const next = current + 1
        return next >= tracks.length ? 0 : next
      })
    }

    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [tracks.length])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        showPlaylist &&
        playlistPopoverRef.current &&
        !playlistPopoverRef.current.contains(target)
      ) {
        setShowPlaylist(false)
      }
      if (
        showVolume &&
        volumePopoverRef.current &&
        !volumePopoverRef.current.contains(target)
      ) {
        setShowVolume(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPlaylist, showVolume])

  const handleToggle = () => {
    if (!currentTrack) return
    setIsPlaying((prev) => !prev)
  }

  const handlePrev = () => {
    if (tracks.length === 0) return
    setTrackIndex((current) => {
      const next = current - 1
      return next < 0 ? tracks.length - 1 : next
    })
  }

  const handleNext = () => {
    if (tracks.length === 0) return
    setTrackIndex((current) => {
      const next = current + 1
      return next >= tracks.length ? 0 : next
    })
  }

  const handlePlaylistChange = (value: string) => {
    setPlaylistId(value)
    setTrackIndex(0)
    setIsPlaying(false)
    setShowPlaylist(false)
  }


  if (!playlist) {
    return null
  }

  return (
    <div className="music-player" aria-label="Player de musica">
      <div className="music-track" title={currentTrack?.title ?? ''}>
        {currentTrack?.title ?? 'Sem faixa'}
      </div>
      <div className="music-row">
        <div className="music-controls">
          <button
            type="button"
            className="music-button"
            onClick={handlePrev}
            disabled={tracks.length === 0}
            aria-label="Faixa anterior"
          >
            ◀
          </button>
          <button
            type="button"
            className="music-button is-primary"
            onClick={handleToggle}
            disabled={tracks.length === 0}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="music-button"
            onClick={handleNext}
            disabled={tracks.length === 0}
            aria-label="Proxima faixa"
          >
            ▶
          </button>
        </div>
        <div className="music-tools">
          <div
            ref={playlistPopoverRef}
            className={`music-popover${showPlaylist ? ' is-open' : ''}`}
          >
            <button
              type="button"
              className="music-icon-button"
              onClick={() => {
                setShowPlaylist((value) => !value)
                setShowVolume(false)
              }}
              aria-label="Playlist"
              aria-expanded={showPlaylist}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 6h12M6 12h12M6 18h8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
            <div className="music-popover-panel">
              <select
                className="music-select"
                value={playlistId}
                onChange={(event) => handlePlaylistChange(event.target.value)}
                aria-label="Playlist"
              >
                {playlists.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div
            ref={volumePopoverRef}
            className={`music-popover${showVolume ? ' is-open' : ''}`}
          >
            <button
              type="button"
              className="music-icon-button"
              onClick={() => {
                setShowVolume((value) => !value)
                setShowPlaylist(false)
              }}
              aria-label="Volume"
              aria-expanded={showVolume}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 10h4l4-4v12l-4-4H4z"
                  fill="currentColor"
                />
                <path
                  d="M16 9c1.4 1.2 1.4 4.8 0 6"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </button>
            <div className="music-popover-panel">
              <div className="music-volume-slider">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  aria-label="Volume"
                />
                <span className="music-volume-value">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
