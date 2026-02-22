const AUTH_URL = 'https://accounts.spotify.com/authorize'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const TOKEN_KEY = 'codex-spotify-token'
const VERIFIER_KEY = 'codex-spotify-code-verifier'
const STATE_KEY = 'codex-spotify-state'
const RETURN_KEY = 'codex-spotify-return'
const EVENT_KEY = 'codex-spotify-auth-change'

const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ')

export type SpotifyToken = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  scope: string
  tokenType: string
}

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined

const emitChange = () => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENT_KEY))
}

export const subscribeSpotifyAuth = (handler: () => void) => {
  if (typeof window === 'undefined') return () => {}
  const listener = () => handler()
  window.addEventListener(EVENT_KEY, listener)
  return () => window.removeEventListener(EVENT_KEY, listener)
}

export const isSpotifyConfigured = () => Boolean(clientId)

export const getSpotifyRedirectUri = () => {
  if (typeof window === 'undefined') return ''
  const envRedirect = import.meta.env.VITE_SPOTIFY_REDIRECT_URI as
    | string
    | undefined
  return envRedirect ?? `${window.location.origin}/spotify/callback`
}

export const getSpotifyToken = (): SpotifyToken | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SpotifyToken
  } catch {
    return null
  }
}

const storeSpotifyToken = (token: SpotifyToken) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  emitChange()
}

export const clearSpotifyToken = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  emitChange()
}

export const getSpotifyReturnPath = () => {
  if (typeof window === 'undefined') return '/'
  const next = window.sessionStorage.getItem(RETURN_KEY)
  if (next) {
    window.sessionStorage.removeItem(RETURN_KEY)
    return next
  }
  return '/'
}

const base64UrlEncode = (input: ArrayBuffer) => {
  const bytes = new Uint8Array(input)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  const base64 = window.btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const generateRandomString = (length: number) => {
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return Array.from(array, (dec) => dec.toString(16).padStart(2, '0')).join('')
}

const generateCodeChallenge = async (verifier: string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

export const startSpotifyAuth = async (returnTo?: string) => {
  if (!clientId) {
    throw new Error('Spotify client ID nao configurado')
  }
  if (typeof window === 'undefined') return

  const verifier = generateRandomString(64)
  const challenge = await generateCodeChallenge(verifier)
  const state = generateRandomString(16)
  const redirectUri = getSpotifyRedirectUri()

  window.sessionStorage.setItem(VERIFIER_KEY, verifier)
  window.sessionStorage.setItem(STATE_KEY, state)
  window.sessionStorage.setItem(
    RETURN_KEY,
    returnTo ?? `${window.location.pathname}${window.location.search}`,
  )

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
    state,
  })

  window.location.assign(`${AUTH_URL}?${params.toString()}`)
}

export const handleSpotifyCallback = async (code: string, state?: string) => {
  if (!clientId) {
    throw new Error('Spotify client ID nao configurado')
  }
  if (typeof window === 'undefined') return

  const storedState = window.sessionStorage.getItem(STATE_KEY)
  if (storedState && state && storedState !== state) {
    throw new Error('Estado invalido na autenticacao do Spotify')
  }

  const verifier = window.sessionStorage.getItem(VERIFIER_KEY)
  if (!verifier) {
    throw new Error('Codigo verificador ausente')
  }

  const redirectUri = getSpotifyRedirectUri()
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const payload = (await response.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    scope?: string
    token_type?: string
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description ?? 'Falha ao autenticar Spotify')
  }

  storeSpotifyToken({
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    scope: payload.scope ?? SPOTIFY_SCOPES,
    tokenType: payload.token_type ?? 'Bearer',
  })

  window.sessionStorage.removeItem(VERIFIER_KEY)
  window.sessionStorage.removeItem(STATE_KEY)
}

export const getValidAccessToken = async () => {
  const token = getSpotifyToken()
  if (!token) return null

  if (Date.now() < token.expiresAt - 60_000) {
    return token
  }

  if (!token.refreshToken) {
    clearSpotifyToken()
    return null
  }

  const body = new URLSearchParams({
    client_id: clientId ?? '',
    grant_type: 'refresh_token',
    refresh_token: token.refreshToken,
  })

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const payload = (await response.json()) as {
    access_token?: string
    expires_in?: number
    scope?: string
    token_type?: string
    refresh_token?: string
    error?: string
    error_description?: string
  }

  if (!response.ok || !payload.access_token) {
    clearSpotifyToken()
    throw new Error(payload.error_description ?? 'Falha ao renovar token')
  }

  const nextToken: SpotifyToken = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? token.refreshToken,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000,
    scope: payload.scope ?? token.scope,
    tokenType: payload.token_type ?? token.tokenType,
  }

  storeSpotifyToken(nextToken)
  return nextToken
}
