import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getSpotifyReturnPath,
  handleSpotifyCallback,
} from '../services/spotifyAuth'

export function SpotifyCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('Conectando Spotify...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state') ?? undefined

    if (!code) {
      setError('Codigo de autorizacao ausente.')
      return
    }

    handleSpotifyCallback(code, state)
      .then(() => {
        setMessage('Spotify conectado! Redirecionando...')
        const next = getSpotifyReturnPath()
        navigate(next, { replace: true })
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Falha ao conectar')
      })
  }, [searchParams, navigate])

  return (
    <div className="page">
      <section className="card">
        <h2>Spotify</h2>
        {error ? <p>{error}</p> : <p>{message}</p>}
      </section>
    </div>
  )
}
