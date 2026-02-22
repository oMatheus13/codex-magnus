import { useEffect, useMemo, useRef, useState } from 'react'
import { playlists } from '../data/playlists'
import {
  clearSpotifyToken,
  getSpotifyToken,
  getValidAccessToken,
  isSpotifyConfigured,
  startSpotifyAuth,
  subscribeSpotifyAuth,
  type SpotifyToken,
} from '../services/spotifyAuth'
import {
  fetchSpotifyPlaylists,
  startSpotifyPlayback,
  transferSpotifyPlayback,
  type SpotifyPlaylist,
} from '../services/spotifyApi'

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
const SPOTIFY_PLAYLIST_KEY = 'codex-spotify-playlist'
const DEFAULT_VOLUME = 0.15

let spotifySdkPromise: Promise<void> | null = null

const loadSpotifySdk = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Spotify indisponivel'))
  }

  if (window.Spotify) {
    return Promise.resolve()
  }

  if (spotifySdkPromise) {
    return spotifySdkPromise
  }

  spotifySdkPromise = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.onerror = () => reject(new Error('Falha ao carregar Spotify SDK'))
    document.body.appendChild(script)
  })

  return spotifySdkPromise
}

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

const getStoredSpotifyPlaylist = () => {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(SPOTIFY_PLAYLIST_KEY) ?? ''
}

const storeSpotifyPlaylist = (uri: string) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SPOTIFY_PLAYLIST_KEY, uri)
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
  const [isLocalPlaying, setIsLocalPlaying] = useState(false)
  const [volume, setVolume] = useState(getStoredVolume)
  const [showVolume, setShowVolume] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [spotifyToken, setSpotifyToken] = useState<SpotifyToken | null>(() =>
    getSpotifyToken(),
  )
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([])
  const [spotifyPlaylistUri, setSpotifyPlaylistUri] = useState(() =>
    getStoredSpotifyPlaylist(),
  )
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string | null>(null)
  const [spotifyTrackTitle, setSpotifyTrackTitle] = useState<string | null>(null)
  const [spotifyIsPlaying, setSpotifyIsPlaying] = useState(false)
  const [spotifyHasState, setSpotifyHasState] = useState(false)
  const [spotifyStatus, setSpotifyStatus] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playerRef = useRef<any | null>(null)
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
  const usingSpotify = Boolean(spotifyToken)
  const isPlaying = usingSpotify ? spotifyIsPlaying : isLocalPlaying

  useEffect(() => {
    return subscribeSpotifyAuth(() => {
      setSpotifyToken(getSpotifyToken())
    })
  }, [])

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
    if (usingSpotify) {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
      }
      setIsLocalPlaying(false)
    }
  }, [usingSpotify])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src = currentTrack.src
    audio.load()
    if (isLocalPlaying) {
      audio.play().catch(() => {
        setIsLocalPlaying(false)
      })
    }
  }, [currentTrack?.src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isLocalPlaying) {
      audio.play().catch(() => {
        setIsLocalPlaying(false)
      })
    } else {
      audio.pause()
    }
  }, [isLocalPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
    }
    storeVolume(volume)
  }, [volume])

  useEffect(() => {
    if (!usingSpotify) return
    const player = playerRef.current
    if (!player) return
    player.setVolume(volume).catch(() => {})
  }, [volume, usingSpotify])

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

  useEffect(() => {
    if (!usingSpotify) {
      setSpotifyPlaylists([])
      setSpotifyDeviceId(null)
      setSpotifyTrackTitle(null)
      setSpotifyIsPlaying(false)
      setSpotifyHasState(false)
      setSpotifyStatus(null)
      return
    }

    let isActive = true
    setSpotifyStatus('Carregando Spotify...')

    fetchSpotifyPlaylists()
      .then((items) => {
        if (!isActive) return
        setSpotifyPlaylists(items)
        if (!spotifyPlaylistUri && items[0]) {
          setSpotifyPlaylistUri(items[0].uri)
          storeSpotifyPlaylist(items[0].uri)
        }
      })
      .catch((err) => {
        if (!isActive) return
        setSpotifyStatus(err instanceof Error ? err.message : 'Erro no Spotify')
      })

    loadSpotifySdk()
      .then(() => {
        if (!isActive || playerRef.current || !window.Spotify) return

        const player = new window.Spotify.Player({
          name: 'Codex Magnus',
          getOAuthToken: async (cb) => {
            try {
              const token = await getValidAccessToken()
              if (token) {
                cb(token.accessToken)
              }
            } catch {
              cb('')
            }
          },
          volume,
        })

        playerRef.current = player

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          if (!isActive) return
          setSpotifyDeviceId(device_id)
          setSpotifyStatus(null)
          transferSpotifyPlayback(device_id).catch(() => {})
        })

        player.addListener('not_ready', () => {
          if (!isActive) return
          setSpotifyStatus('Spotify indisponivel no momento')
        })

        player.addListener('player_state_changed', (state: any) => {
          if (!state) return
          setSpotifyHasState(true)
          setSpotifyIsPlaying(!state.paused)
          const track = state.track_window?.current_track
          if (track) {
            const artists = track.artists?.map((item: any) => item.name).join(', ')
            setSpotifyTrackTitle(`${track.name}${artists ? ` • ${artists}` : ''}`)
          }
        })

        player.addListener('initialization_error', (event: { message: string }) => {
          if (!isActive) return
          setSpotifyStatus(event.message)
        })

        player.addListener('authentication_error', (event: { message: string }) => {
          if (!isActive) return
          setSpotifyStatus(event.message)
        })

        player.addListener('account_error', (event: { message: string }) => {
          if (!isActive) return
          setSpotifyStatus(event.message)
        })

        player.connect().catch(() => {
          setSpotifyStatus('Falha ao conectar no Spotify')
        })
      })
      .catch((err) => {
        if (!isActive) return
        setSpotifyStatus(err instanceof Error ? err.message : 'Erro no Spotify')
      })

    return () => {
      isActive = false
    }
  }, [usingSpotify])

  const handleToggle = () => {
    if (usingSpotify) {
      const player = playerRef.current
      if (!player || !spotifyDeviceId) return

      if (spotifyIsPlaying) {
        player.pause().catch(() => {})
        return
      }

      if (spotifyHasState) {
        player.resume().catch(() => {})
        return
      }

      startSpotifyPlayback(spotifyDeviceId, spotifyPlaylistUri || undefined).catch(
        (err) => {
          setSpotifyStatus(
            err instanceof Error ? err.message : 'Falha ao iniciar Spotify',
          )
        },
      )
      return
    }

    if (!currentTrack) return
    setIsLocalPlaying((prev) => !prev)
  }

  const handlePrev = () => {
    if (usingSpotify) {
      const player = playerRef.current
      if (player) {
        player.previousTrack().catch(() => {})
      }
      return
    }

    if (tracks.length === 0) return
    setTrackIndex((current) => {
      const next = current - 1
      return next < 0 ? tracks.length - 1 : next
    })
  }

  const handleNext = () => {
    if (usingSpotify) {
      const player = playerRef.current
      if (player) {
        player.nextTrack().catch(() => {})
      }
      return
    }

    if (tracks.length === 0) return
    setTrackIndex((current) => {
      const next = current + 1
      return next >= tracks.length ? 0 : next
    })
  }

  const handlePlaylistChange = (value: string) => {
    setPlaylistId(value)
    setTrackIndex(0)
    setIsLocalPlaying(false)
    setShowPlaylist(false)
  }

  const handleSpotifyPlaylistChange = (value: string) => {
    setSpotifyPlaylistUri(value)
    storeSpotifyPlaylist(value)
    setShowPlaylist(false)

    if (!spotifyDeviceId) return
    startSpotifyPlayback(spotifyDeviceId, value).catch((err) => {
      setSpotifyStatus(
        err instanceof Error ? err.message : 'Falha ao iniciar playlist',
      )
    })
  }

  const handleSpotifyConnect = () => {
    startSpotifyAuth().catch((err) => {
      setSpotifyStatus(err instanceof Error ? err.message : 'Falha ao conectar')
    })
  }

  const handleSpotifyDisconnect = () => {
    clearSpotifyToken()
    playerRef.current?.disconnect()
    playerRef.current = null
    setSpotifyToken(null)
  }

  if (!playlist) {
    return null
  }

  const trackLabel = usingSpotify
    ? spotifyTrackTitle ?? spotifyStatus ?? 'Spotify conectado'
    : currentTrack?.title ?? 'Sem faixa'

  return (
    <div className="music-player" aria-label="Player de musica">
      <div className="music-track" title={trackLabel}>
        {trackLabel}
      </div>
      <div className="music-row">
        <div className="music-controls">
          <button
            type="button"
            className="music-button"
            onClick={handlePrev}
            disabled={tracks.length === 0 && !usingSpotify}
            aria-label="Faixa anterior"
          >
            ◀
          </button>
          <button
            type="button"
            className="music-button is-primary"
            onClick={handleToggle}
            disabled={tracks.length === 0 && !usingSpotify}
            aria-label={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            className="music-button"
            onClick={handleNext}
            disabled={tracks.length === 0 && !usingSpotify}
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
              {isSpotifyConfigured() && !usingSpotify ? (
                <button
                  type="button"
                  className="music-button is-spotify"
                  onClick={handleSpotifyConnect}
                >
                  Conectar Spotify
                </button>
              ) : null}
              {usingSpotify ? (
                spotifyPlaylists.length > 0 ? (
                  <select
                    className="music-select"
                    value={spotifyPlaylistUri}
                    onChange={(event) =>
                      handleSpotifyPlaylistChange(event.target.value)
                    }
                    aria-label="Playlist Spotify"
                  >
                    {spotifyPlaylists.map((item) => (
                      <option key={item.id} value={item.uri}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="music-spotify-note">
                    Nenhuma playlist encontrada
                  </span>
                )
              ) : (
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
              )}
              {usingSpotify ? (
                <button
                  type="button"
                  className="music-button is-ghost"
                  onClick={handleSpotifyDisconnect}
                >
                  Desconectar
                </button>
              ) : null}
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
