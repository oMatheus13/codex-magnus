import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { getDevUser, subscribeDevSession, type DevUser } from '../services/devSession'
import { getAvatarSignedUrl } from '../services/avatar'
import {
  getSolarisWallet,
  subscribeSolaris,
  type SolarisType,
} from '../services/solaris'
import solarisMorning from '../assets/solaris/Solaris Manhã.png'
import solarisAfternoon from '../assets/solaris/Solaris Tarde.png'
import solarisNight from '../assets/solaris/Solaris Noite.png'
import { diceCatalog } from '../data/dice'
import {
  getDiceInventory,
  subscribeDiceInventory,
  type DiceInventory,
} from '../services/diceInventory'
import { DiceIcon } from './DiceIcon'

const solarisIcons: Array<{
  id: SolarisType
  src: string
  label: string
}> = [
  { id: 'morning', src: solarisMorning, label: 'Manha' },
  { id: 'afternoon', src: solarisAfternoon, label: 'Tarde' },
  { id: 'night', src: solarisNight, label: 'Noite' },
]

export function TopBar() {
  const [user, setUser] = useState<User | null>(null)
  const [devUser, setDevUser] = useState<DevUser | null>(() => getDevUser())
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [solarisCounts, setSolarisCounts] = useState(() =>
    getSolarisWallet(),
  )
  const [diceInventory, setDiceInventory] = useState<DiceInventory>(() =>
    getDiceInventory(),
  )
  const isDev = import.meta.env.DEV

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
    return subscribeSolaris(() => {
      setSolarisCounts(getSolarisWallet())
    })
  }, [])

  useEffect(() => {
    return subscribeDiceInventory(() => {
      setDiceInventory(getDiceInventory())
    })
  }, [])

  const activeUser = user ?? devUser
  const avatarPath = activeUser?.user_metadata?.avatar_path as string | undefined
  const avatarFallback =
    (activeUser?.user_metadata?.avatar_url as string | undefined) ||
    (activeUser?.user_metadata?.avatar as string | undefined) ||
    (activeUser?.user_metadata?.picture as string | undefined) ||
    (activeUser?.user_metadata?.photo as string | undefined)

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
    (activeUser?.user_metadata?.display_name as string | undefined) ||
    (activeUser?.user_metadata?.name as string | undefined) ||
    activeUser?.email ||
    'Visitante'
  const handle =
    (activeUser?.user_metadata?.username as string | undefined) ||
    (activeUser?.user_metadata?.handle as string | undefined) ||
    activeUser?.email?.split('@')[0]
  const status = activeUser ? `@${handle ?? 'usuario'}` : 'Sem login'

  return (
    <header className="top-bar">
      <div className="top-left">
        {activeUser ? (
          <Link className="profile-button" to="/configuracoes">
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
      </div>
      <div className="top-actions">
        <div className="solaris-stack">
          {solarisIcons.map((icon) => (
            <div
              key={icon.id}
              className={`solaris-item solaris-item--${icon.id}`}
              title={icon.label}
            >
              <img
                className="solaris-icon"
                src={icon.src}
                alt=""
                aria-hidden="true"
              />
              <span className="solaris-amount">
                {solarisCounts[icon.id]}
              </span>
            </div>
          ))}
        </div>
        <div className="topbar-divider" aria-hidden="true" />
        <div className="dice-stack">
          {diceCatalog.map((item) => (
            <div key={item.id} className={`dice-item dice-item--${item.id}`}>
              <DiceIcon
                variant={item.id}
                label={`${item.faces}`}
                className="dice-icon"
              />
              <span className="dice-amount">
                {isDev ? '∞' : diceInventory[item.id] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
