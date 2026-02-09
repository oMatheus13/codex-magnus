import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { getAvatarSignedUrl } from '../services/avatar'
import solarisMorning from '../assets/solaris/Solaris Manhã.png'
import solarisAfternoon from '../assets/solaris/Solaris Tarde.png'
import solarisNight from '../assets/solaris/Solaris Noite.png'

const solarisIcons = [
  { id: 'morning', src: solarisMorning },
  { id: 'afternoon', src: solarisAfternoon },
  { id: 'night', src: solarisNight },
]

export function TopBar() {
  const [user, setUser] = useState<User | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

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

  const avatarPath = user?.user_metadata?.avatar_path as string | undefined
  const avatarFallback =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.avatar as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined) ||
    (user?.user_metadata?.photo as string | undefined)

  useEffect(() => {
    let isActive = true
    if (!avatarPath) {
      setAvatarUrl(null)
      return () => {
        isActive = false
      }
    }

    getAvatarSignedUrl(avatarPath)
      .then((url) => {
        if (!isActive) return
        setAvatarUrl(url)
      })
      .catch(() => {
        if (!isActive) return
        setAvatarUrl(null)
      })

    return () => {
      isActive = false
    }
  }, [avatarPath])

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    'Visitante'
  const handle =
    (user?.user_metadata?.username as string | undefined) ||
    (user?.user_metadata?.handle as string | undefined) ||
    user?.email?.split('@')[0]
  const status = user ? `@${handle ?? 'usuario'}` : 'Sem login'

  return (
    <header className="top-bar">
      {user ? (
        <Link className="profile-button" to="/perfil">
          <div className="profile">
            <div className="avatar">
              {avatarUrl || avatarFallback ? (
                <img src={avatarUrl ?? avatarFallback} alt="" />
              ) : (
                <span className="avatar-fallback" aria-hidden="true">
                  CM
                </span>
              )}
            </div>
            <div className="profile-info">
              <span className="profile-name">{displayName}</span>
              <span className="profile-status">{status}</span>
            </div>
          </div>
        </Link>
      ) : (
        <Link className="button ghost" to="/login">
          Entrar
        </Link>
      )}
      <div className="top-actions">
        <div className="solaris-stack">
          {solarisIcons.map((icon) => (
            <div key={icon.id} className="solaris-item">
              <img
                className="solaris-icon"
                src={icon.src}
                alt=""
                aria-hidden="true"
              />
              <span className="solaris-amount">0</span>
            </div>
          ))}
        </div>
        <button className="icon-button" type="button">
          Config
        </button>
      </div>
    </header>
  )
}
