import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { Link } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { AVATAR_BUCKET, getAvatarSignedUrl } from '../services/avatar'
import {
  clearDevUser,
  getDevUser,
  subscribeDevSession,
  updateDevUser,
  type DevUser,
} from '../services/devSession'
import { calculateHabitPointsStats } from '../core/habitStats'
import { estimateDailyMoves } from '../core/progression'
import { oficinaHabits } from '../data/oficina'
import { getSolarisWallet, subscribeSolaris } from '../services/solaris'
import {
  getDiceInventory,
  subscribeDiceInventory,
} from '../services/diceInventory'

const MAX_AVATAR_INPUT_BYTES = 8 * 1024 * 1024
const MAX_AVATAR_EDGE = 512
const AVATAR_WEBP_QUALITY = 0.82
const USERNAME_COOLDOWN_DAYS = 60
const USERNAME_COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000

const formatDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const normalizeHandle = (value: string) =>
  value.trim().replace(/^@/, '').replace(/\s+/g, '')

const formatNumber = (value: number, digits = 0) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

export function Profile() {
  const [user, setUser] = useState<User | null>(null)
  const [devUser, setDevUser] = useState<DevUser | null>(() => getDevUser())
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarRemoteUrl, setAvatarRemoteUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [wallet, setWallet] = useState(() => getSolarisWallet())
  const [diceInventory, setDiceInventory] = useState(() =>
    getDiceInventory(),
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isActive = true

    supabase.auth.getUser().then(({ data }) => {
      if (!isActive) return
      setUser(data.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      },
    )

    return () => {
      isActive = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    return subscribeDevSession(() => {
      setDevUser(getDevUser())
    })
  }, [])

  useEffect(() => {
    return subscribeSolaris(() => setWallet(getSolarisWallet()))
  }, [])

  useEffect(() => {
    return subscribeDiceInventory(() => setDiceInventory(getDiceInventory()))
  }, [])

  const activeUser = user ?? devUser
  const isDevSession = Boolean(devUser && !user)
  const avatarPath = activeUser?.user_metadata?.avatar_path as string | undefined
  const avatarFallback =
    (activeUser?.user_metadata?.avatar_url as string | undefined) ||
    (activeUser?.user_metadata?.avatar as string | undefined) ||
    (activeUser?.user_metadata?.picture as string | undefined) ||
    (activeUser?.user_metadata?.photo as string | undefined)

  const baseDisplayName =
    (activeUser?.user_metadata?.display_name as string | undefined) ||
    (activeUser?.user_metadata?.name as string | undefined) ||
    activeUser?.email ||
    'Usuario'

  const storedUsername =
    (activeUser?.user_metadata?.username as string | undefined) ||
    (activeUser?.user_metadata?.handle as string | undefined)

  const usernameUpdatedAt =
    (activeUser?.user_metadata?.username_updated_at as string | undefined) ||
    (activeUser?.user_metadata?.username_set_at as string | undefined)

  const lastUsernameChange = usernameUpdatedAt
    ? new Date(usernameUpdatedAt)
    : null

  const nextUsernameChangeAt =
    lastUsernameChange && !Number.isNaN(lastUsernameChange.getTime())
      ? new Date(lastUsernameChange.getTime() + USERNAME_COOLDOWN_MS)
      : null

  const cooldownActive =
    Boolean(storedUsername) &&
    nextUsernameChangeAt !== null &&
    Date.now() < nextUsernameChangeAt.getTime()

  const canEditUsername = !storedUsername || !cooldownActive
  const usernameLocked = Boolean(storedUsername) && !canEditUsername

  useEffect(() => {
    if (!activeUser) return
    setDisplayName(baseDisplayName)
    setUsername(storedUsername ?? '')
    setAvatarPreview(null)
  }, [activeUser, baseDisplayName, storedUsername])

  useEffect(() => {
    let isActive = true

    if (!avatarPath) {
      setAvatarRemoteUrl(avatarFallback ?? null)
      return () => {
        isActive = false
      }
    }

    getAvatarSignedUrl(avatarPath)
      .then((url) => {
        if (!isActive) return
        setAvatarRemoteUrl(url)
      })
      .catch(() => {
        if (!isActive) return
        setAvatarRemoteUrl(avatarFallback ?? null)
      })

    return () => {
      isActive = false
    }
  }, [avatarPath, avatarFallback])

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const usernameDisplay = useMemo(() => {
    if (storedUsername) return `@${storedUsername}`
    if (username) return `@${normalizeHandle(username)}`
    return '@usuario'
  }, [storedUsername, username])

  const habitStats = useMemo(() => calculateHabitPointsStats(oficinaHabits), [])
  const moveStats = useMemo(
    () =>
      estimateDailyMoves({
        estimatedDailyPoints: habitStats.estimatedDailyPoints,
      }),
    [habitStats.estimatedDailyPoints],
  )
  const totalSolaris =
    (wallet.morning ?? 0) + (wallet.afternoon ?? 0) + (wallet.night ?? 0)
  const totalDice =
    (diceInventory.aurora ?? 0) +
    (diceInventory.vesper ?? 0) +
    (diceInventory.noctis ?? 0)

  if (!activeUser) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Perfil</h1>
          <p>Entre para acessar suas informacoes.</p>
        </header>
        <section className="card">
          <div className="profile-empty">Sem login ativo.</div>
          <Link className="button primary" to="/login">
            Entrar
          </Link>
        </section>
      </div>
    )
  }

  const nameDirty = displayName.trim() !== baseDisplayName
  const normalizedUsername = normalizeHandle(username)
  const usernameDirty =
    canEditUsername &&
    normalizedUsername.length > 0 &&
    normalizedUsername !== storedUsername
  const isBusy = isSaving || isProcessing
  const currentAvatar = avatarPreview ?? avatarRemoteUrl
  const canRemoveAvatar = Boolean(currentAvatar)

  const syncProfile = async (payload: Record<string, string | null>) => {
    if (!user) return

    const update: {
      id: string
      display_name?: string
      username?: string
    } = { id: user.id }

    if (payload.display_name !== undefined) {
      update.display_name = payload.display_name ?? undefined
    }
    if (payload.username !== undefined) {
      update.username = payload.username ?? undefined
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(update, { onConflict: 'id' })

    return profileError ?? null
  }

  const updateUser = async (data: { display_name?: string }) => {
    setIsSaving(true)
    setMessage(null)
    setError(null)

    if (isDevSession) {
      const updated = updateDevUser({
        user_metadata: {
          display_name: data.display_name,
        },
      })

      if (!updated) {
        setError('Falha ao atualizar no modo dev')
      } else {
        setMessage('Perfil atualizado (dev)')
      }

      setIsSaving(false)
      return
    }

    const { data: result, error: updateError } = await supabase.auth.updateUser({
      data,
    })

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    setUser(result.user)

    const profileError = await syncProfile({
      display_name: data.display_name ?? null,
    })

    if (profileError) {
      setError(profileError.message)
    } else {
      setMessage('Perfil atualizado')
    }

    setIsSaving(false)
  }

  const handleSaveName = async () => {
    if (isBusy || !nameDirty) return
    if (!displayName.trim()) {
      setError('Informe um nome valido')
      return
    }
    await updateUser({ display_name: displayName.trim() })
  }

  const handleSaveUsername = async () => {
    if (isBusy || !usernameDirty) return
    if (!canEditUsername) {
      const nextChange = nextUsernameChangeAt
        ? formatDate(nextUsernameChangeAt.toISOString())
        : null
      setError(
        nextChange
          ? `Troca de @ liberada em ${nextChange}`
          : 'Troca de @ temporariamente bloqueada',
      )
      return
    }
    const normalized = normalizeHandle(username)
    if (!normalized) {
      setError('Defina um @ valido')
      return
    }
    if (storedUsername && normalized === storedUsername) {
      setError('Escolha um @ diferente')
      return
    }
    const now = new Date().toISOString()

    if (isDevSession) {
      setIsSaving(true)
      setMessage(null)
      setError(null)

      const updated = updateDevUser({
        user_metadata: {
          username: normalized,
          username_updated_at: now,
        },
      })

      if (!updated) {
        setError('Falha ao atualizar no modo dev')
      } else {
        setMessage('Perfil atualizado (dev)')
      }

      setIsSaving(false)
      return
    }

    setIsSaving(true)
    setMessage(null)
    setError(null)

    const { data: result, error: updateError } = await supabase.auth.updateUser({
      data: {
        username: normalized,
        username_updated_at: now,
      },
    })

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    const profileError = await syncProfile({ username: normalized })

    if (profileError) {
      if (profileError.code === '23505') {
        setError('Esse @ ja esta em uso')
      } else {
        setError(profileError.message)
      }

      const rollback = await supabase.auth.updateUser({
        data: {
          username: storedUsername ?? null,
          username_updated_at: usernameUpdatedAt ?? null,
        },
      })

      if (rollback.data?.user) {
        setUser(rollback.data.user)
      }

      setIsSaving(false)
      return
    }

    setUser(result.user)
    setMessage('Perfil atualizado')
    setIsSaving(false)
  }

  const handleSaveAvatar = async (blob: Blob, previewUrl: string) => {
    if (!user && !isDevSession) return
    setIsSaving(true)
    setMessage('Salvando foto...')
    setError(null)

    if (isDevSession) {
      try {
        const dataUrl = await blobToDataUrl(blob)
        const updated = updateDevUser({
          user_metadata: {
            avatar_url: dataUrl,
            avatar_path: null,
          },
        })

        if (!updated) {
          throw new Error('Falha ao salvar no modo dev')
        }

        if (previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl)
        }
        setAvatarPreview(null)
        setAvatarRemoteUrl(dataUrl)
        setMessage('Foto atualizada (dev)')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao salvar a foto')
      } finally {
        setIsSaving(false)
      }
      return
    }

    const currentUser = user
    if (!currentUser) {
      setError('Sessao expirada, faça login novamente')
      setIsSaving(false)
      return
    }

    try {
      const filePath = `avatars/${currentUser.id}/profile.webp`
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/webp',
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const signedUrl = await getAvatarSignedUrl(filePath)
      const { data: result, error: updateError } =
        await supabase.auth.updateUser({
          data: {
            avatar_path: filePath,
          },
        })

      if (updateError) {
        throw new Error(updateError.message)
      }

      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
      setUser(result.user)
      setAvatarPreview(null)
      setAvatarRemoteUrl(signedUrl)
      setMessage('Foto atualizada')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar a foto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if ((!user && !isDevSession) || isBusy || !canRemoveAvatar) return
    setIsSaving(true)
    setMessage('Removendo foto...')
    setError(null)

    if (isDevSession) {
      const updated = updateDevUser({
        user_metadata: {
          avatar_url: null,
          avatar_path: null,
        },
      })

      if (!updated) {
        setError('Falha ao remover no modo dev')
      } else {
        if (avatarPreview?.startsWith('blob:')) {
          URL.revokeObjectURL(avatarPreview)
        }
        setAvatarPreview(null)
        setAvatarRemoteUrl(null)
        setMessage('Foto removida (dev)')
      }

      setIsSaving(false)
      return
    }

    try {
      if (avatarPath) {
        const { error: removeError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .remove([avatarPath])

        if (removeError) {
          throw new Error(removeError.message)
        }
      }

      const { data: result, error: updateError } =
        await supabase.auth.updateUser({
          data: {
            avatar_path: null,
          },
        })

      if (updateError) {
        throw new Error(updateError.message)
      }

      if (avatarPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
      setUser(result.user)
      setAvatarPreview(null)
      setAvatarRemoteUrl(null)
      setMessage('Foto removida')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover a foto')
    } finally {
      setIsSaving(false)
    }
  }

  const loadImage = (file: File) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve(image)
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Falha ao carregar a imagem'))
      }
      image.src = url
    })

  const processAvatarFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Selecione um arquivo de imagem valido')
    }
    if (file.size > MAX_AVATAR_INPUT_BYTES) {
      throw new Error('A imagem precisa ter menos de 8MB')
    }

    const image = await loadImage(file)
    const scale = Math.min(1, MAX_AVATAR_EDGE / Math.max(image.width, image.height))
    const targetWidth = Math.max(1, Math.round(image.width * scale))
    const targetHeight = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Falha ao preparar a imagem')
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', AVATAR_WEBP_QUALITY)
    })
    if (!blob) {
      throw new Error('Falha ao converter para WebP')
    }

    return blob
  }

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
        } else {
          reject(new Error('Falha ao ler a imagem'))
        }
      }
      reader.onerror = () => reject(new Error('Falha ao ler a imagem'))
      reader.readAsDataURL(blob)
    })

  const handlePickAvatar = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError(null)
    setMessage(null)
    setIsProcessing(true)

    try {
      const processedBlob = await processAvatarFile(file)
      const previousPreview = avatarPreview
      if (previousPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(previousPreview)
      }
      const previewUrl = URL.createObjectURL(processedBlob)
      setAvatarPreview(previewUrl)
      setAvatarRemoteUrl(null)
      await handleSaveAvatar(processedBlob, previewUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao processar a foto')
    } finally {
      setIsProcessing(false)
      event.target.value = ''
    }
  }

  const handleSignOut = async () => {
    setIsSaving(true)
    setError(null)
    if (isDevSession) {
      clearDevUser()
      setIsSaving(false)
      return
    }
    await supabase.auth.signOut()
    setIsSaving(false)
  }

  const handleDeleteAccount = async () => {
    if (isBusy || (!user && !isDevSession)) return
    const confirmed = window.confirm('Apagar conta? Essa acao e definitiva.')
    if (!confirmed) return
    const typed = window.prompt('Digite APAGAR para confirmar')
    if (typed !== 'APAGAR') return

    setIsSaving(true)
    setError(null)
    setMessage(null)

    if (isDevSession) {
      clearDevUser()
      setMessage('Conta dev removida')
      setIsSaving(false)
      return
    }

    const { error: deleteError } = await supabase.rpc('delete_user')

    if (deleteError) {
      setError(deleteError.message)
      setIsSaving(false)
      return
    }

    await supabase.auth.signOut()
    setMessage('Conta apagada')
    setIsSaving(false)
  }
  return (
    <div className="page">
      <header className="page-header">
        <h1>Perfil</h1>
        <p>Dados da conta e estatisticas pessoais.</p>
      </header>

      <section className="card profile-card">
        <div className="profile-card-top">
          <div className="profile-avatar">
            <button
              className="avatar-button"
              type="button"
              onClick={handlePickAvatar}
            >
              <div className="avatar avatar-large">
                {currentAvatar ? (
                  <img src={currentAvatar} alt="" />
                ) : (
                  <span className="avatar-fallback" aria-hidden="true">
                    CM
                  </span>
                )}
              </div>
            </button>
            <button
              className="button danger avatar-remove"
              type="button"
              onClick={handleRemoveAvatar}
              disabled={isBusy || !canRemoveAvatar}
            >
              Remover foto
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
            />
            {isProcessing ? (
              <div className="profile-help">Processando imagem...</div>
            ) : null}
          </div>
          <div className="profile-card-info">
            <div className="profile-row">
              <span className="profile-field">Nome</span>
              <div className="profile-input">
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && nameDirty) {
                      event.preventDefault()
                      void handleSaveName()
                    }
                  }}
                  onBlur={() => {
                    if (nameDirty) {
                      void handleSaveName()
                    }
                  }}
                />
              </div>
            </div>
            <div className="profile-row">
              <span className="profile-field">Usuario</span>
              {usernameLocked ? (
                <div className="profile-static">
                  <span className="profile-value">{usernameDisplay}</span>
                  <span className="locked-badge">fixo</span>
                  {nextUsernameChangeAt ? (
                    <span className="locked-badge">
                      libera {formatDate(nextUsernameChangeAt.toISOString())}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="profile-input">
                  <span className="profile-prefix">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="seu_usuario"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        if (usernameDirty) {
                          void handleSaveUsername()
                        }
                      }
                    }}
                    onBlur={() => {
                      if (usernameDirty) {
                        void handleSaveUsername()
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {message ? <div className="profile-message">{message}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
      </section>

      <section className="stats-grid">
        <div className="card stat-card">
          <div className="stat-value">{formatNumber(totalSolaris, 0)}</div>
          <div className="stat-label">Solaris totais</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{formatDate(activeUser.created_at)}</div>
          <div className="stat-label">Conta criada</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{formatNumber(totalDice, 0)}</div>
          <div className="stat-label">Dados base</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">
            {formatNumber(moveStats.movesPerDay, 1)}
          </div>
          <div className="stat-label">Casas por dia (estim.)</div>
        </div>
      </section>

      <section className="shop-metrics profile-metrics">
        <div className="shop-metrics-header">
          <div>
            <div className="shop-metrics-title">Painel de estimativa</div>
            <div className="shop-metrics-subtitle">
              Baseado nos habitos cadastrados, incluindo sazonais.
            </div>
          </div>
          <div className="shop-metrics-chip">Projecao diaria</div>
        </div>
        <div className="shop-metrics-grid">
          <div className="shop-metric">
            <span className="shop-metric-label">Pontos totais</span>
            <strong className="shop-metric-value">
              {formatNumber(habitStats.totalPoints, 0)}
            </strong>
            <span className="shop-metric-helper">soma geral</span>
          </div>
          <div className="shop-metric">
            <span className="shop-metric-label">Estimativa diaria</span>
            <strong className="shop-metric-value">
              {formatNumber(habitStats.estimatedDailyPoints, 1)}
            </strong>
            <span className="shop-metric-helper">pontos por dia</span>
          </div>
          <div className="shop-metric">
            <span className="shop-metric-label">Captação diaria</span>
            <strong className="shop-metric-value">
              {formatNumber(habitStats.estimatedDailyPercent, 1)}%
            </strong>
            <span className="shop-metric-helper">peso diario</span>
          </div>
        </div>
        <div className="shop-estimate">
          <div className="shop-estimate-row">
            <span>Ritmo diario estimado</span>
            <strong>{formatNumber(habitStats.estimatedDailyPercent, 1)}%</strong>
          </div>
          <div className="shop-estimate-bar" aria-hidden="true">
            <span
              style={
                {
                  width: `${habitStats.estimatedDailyPercent}%`,
                } as CSSProperties
              }
            />
          </div>
        </div>
        <div className="shop-frequency">
          <div className="shop-frequency-title">Distribuicao por frequencia</div>
          <div className="shop-frequency-grid">
            {(['daily', 'weekly', 'monthly', 'quarterly'] as const).map(
              (freq) => (
                <div key={freq} className="shop-frequency-card">
                  <span>
                    {freq === 'daily'
                      ? 'Diario'
                      : freq === 'weekly'
                        ? 'Semanal'
                        : freq === 'monthly'
                          ? 'Mensal'
                          : 'Trimestral'}
                  </span>
                  <strong>{formatNumber(habitStats.totals[freq], 0)}</strong>
                </div>
              ),
            )}
          </div>
        </div>
        <div className="profile-progress">
          <div className="profile-progress-title">Estimativa de movimento</div>
          <div className="profile-progress-grid">
            <div>
              <span>Casas por semana</span>
              <strong>{formatNumber(moveStats.movesPerWeek, 1)}</strong>
            </div>
            <div>
              <span>Casas em 2 semanas</span>
              <strong>{formatNumber(moveStats.movesPerTwoWeeks, 1)}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="card profile-details">
        <div className="card-title">Dados completos</div>
        <div className="detail-row">
          <span>Email</span>
          <span className="detail-value">{activeUser.email}</span>
        </div>
        <div className="detail-row">
          <span>ID</span>
          <span className="detail-value">{activeUser.id}</span>
        </div>
      </section>

      <section className="card danger-card">
        <div className="card-title">Zona de risco</div>
        <div className="detail-row">
          <span>Apagar conta</span>
          <button
            className="button danger"
            type="button"
            onClick={handleDeleteAccount}
            disabled={isBusy}
          >
            Apagar conta
          </button>
        </div>
      </section>

      <button
        className="button ghost"
        type="button"
        onClick={handleSignOut}
        disabled={isBusy}
      >
        Sair
      </button>
    </div>
  )
}
