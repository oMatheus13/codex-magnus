import { getValidAccessToken } from './spotifyAuth'

const API_BASE = 'https://api.spotify.com/v1'

export type SpotifyPlaylist = {
  id: string
  name: string
  uri: string
  tracksTotal: number
}

const authorizedFetch = async (input: string, init?: RequestInit) => {
  const token = await getValidAccessToken()
  if (!token) {
    throw new Error('Spotify nao conectado')
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token.accessToken}`,
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Falha na requisicao do Spotify')
  }

  return response
}

export const fetchSpotifyPlaylists = async () => {
  const response = await authorizedFetch(`${API_BASE}/me/playlists?limit=50`)
  const payload = (await response.json()) as {
    items?: Array<{
      id: string
      name: string
      uri: string
      tracks?: { total?: number }
    }>
  }

  return (
    payload.items?.map((item) => ({
      id: item.id,
      name: item.name,
      uri: item.uri,
      tracksTotal: item.tracks?.total ?? 0,
    })) ?? []
  )
}

export const transferSpotifyPlayback = async (
  deviceId: string,
  shouldPlay = false,
) => {
  await authorizedFetch(`${API_BASE}/me/player`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      device_ids: [deviceId],
      play: shouldPlay,
    }),
  })
}

export const startSpotifyPlayback = async (
  deviceId: string,
  contextUri?: string,
) => {
  await authorizedFetch(`${API_BASE}/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: contextUri ? JSON.stringify({ context_uri: contextUri }) : undefined,
  })
}
