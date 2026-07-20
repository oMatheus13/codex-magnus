import { useState, useEffect, useMemo } from 'react'
import { TopBar } from '../components/TopBar'
import { BottomNav } from '../components/BottomNav'
import { getRoadmaps, createRoadmap, addRoadmapItem, toggleRoadmapItem, deleteRoadmap, deleteRoadmapItem, subscribeRoadmaps, type RoadmapData } from '../services/roadmaps'
import '../styles/roadmap.css'

export function Roadmap() {
  const [roadmaps, setRoadmaps] = useState<RoadmapData[]>([])
  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null)
  
  // Form State
  const [showForm, setShowForm] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [newItemSite, setNewItemSite] = useState('')
  const [newItemGithub, setNewItemGithub] = useState('')

  useEffect(() => {
    setRoadmaps(getRoadmaps())
    return subscribeRoadmaps(() => setRoadmaps(getRoadmaps()))
  }, [])

  useEffect(() => {
    if (roadmaps.length > 0 && !activeRoadmapId) {
      setActiveRoadmapId(roadmaps[0].id)
    }
  }, [roadmaps, activeRoadmapId])

  const activeRoadmap = useMemo(() => roadmaps.find(r => r.id === activeRoadmapId), [roadmaps, activeRoadmapId])

  const handleCreateRoadmap = () => {
    const name = prompt('Nome do novo Roadmap:')
    if (name) {
      const rm = createRoadmap(name)
      setActiveRoadmapId(rm.id)
    }
  }

  const handleDeleteRoadmap = () => {
    if (!activeRoadmapId) return
    if (confirm('Tem certeza que deseja deletar este roadmap inteiro?')) {
      deleteRoadmap(activeRoadmapId)
      setActiveRoadmapId(null)
    }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRoadmapId || !newItemName) return
    addRoadmapItem(activeRoadmapId, {
      title: newItemName,
      description: newItemDesc,
      siteUrl: newItemSite,
      githubUrl: newItemGithub,
    })
    setShowForm(false)
    setNewItemName(''); setNewItemDesc(''); setNewItemSite(''); setNewItemGithub('')
  }

  // Generates organic SVG path connecting staggered nodes
  const generatePath = (itemsCount: number) => {
    if (itemsCount === 0) return ''
    let d = `M 50 150 ` // Start point
    for (let i = 0; i < itemsCount; i++) {
      const x = 50 + (i * 250)
      const nextX = x + 250
      const isUp = i % 2 === 0
      const targetY = isUp ? 80 : 220
      
      if (i === 0) {
        d += `C ${x + 100} 150, ${nextX - 100} ${targetY}, ${nextX} ${targetY} `
      } else {
        const currentY = isUp ? 220 : 80
        d += `C ${x + 100} ${currentY}, ${nextX - 100} ${targetY}, ${nextX} ${targetY} `
      }
    }
    // Fade out path at the end
    const lastX = 50 + (itemsCount * 250)
    const lastY = (itemsCount - 1) % 2 === 0 ? 80 : 220
    d += `C ${lastX + 100} ${lastY}, ${lastX + 200} 150, ${lastX + 250} 150`
    return d
  }

  const renderProgressBar = () => {
    if (!activeRoadmap || activeRoadmap.items.length === 0) return null
    const completedCount = activeRoadmap.items.filter(i => i.completed).length
    const total = activeRoadmap.items.length
    const percentage = Math.round((completedCount / total) * 100)
    
    return (
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ flex: 1, height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.3s ease' }}></div>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{percentage}% ({completedCount}/{total})</span>
      </div>
    )
  }

  return (
    <div className="page roadmap-page">
      <TopBar />
      <main className="content roadmap-content">
        <section className="card title-card">
          <div className="roadmap-header">
            <h1>Roadmaps</h1>
            <div className="roadmap-selector">
              <select value={activeRoadmapId || ''} onChange={e => setActiveRoadmapId(e.target.value)}>
                {roadmaps.length === 0 && <option value="">Nenhum Roadmap</option>}
                {roadmaps.map(rm => (
                  <option key={rm.id} value={rm.id}>{rm.name}</option>
                ))}
              </select>
              <button className="button ghost sm" onClick={handleCreateRoadmap}>+ Novo</button>
              {activeRoadmap && (
                <button className="button danger sm" onClick={handleDeleteRoadmap} style={{ border: '1px solid #ff4444', color: '#ff4444', background: 'transparent', cursor: 'pointer' }}>Excluir Mapa</button>
              )}
            </div>
          </div>
          {renderProgressBar()}
        </section>

        {activeRoadmap && (
          <section className="card neon-map-container">
            <div className="organic-path-wrapper">
              <svg width={Math.max(800, (activeRoadmap.items.length * 250) + 100)} height="300" className="organic-svg">
                <path d={generatePath(activeRoadmap.items.length)} className="neon-path" fill="none" />
              </svg>
              
              <div className="nodes-container">
                {activeRoadmap.items.map((item, idx) => {
                  const cx = 50 + ((idx + 1) * 250)
                  const cy = idx % 2 === 0 ? 80 : 220
                  return (
                    <div key={item.id} className={`roadmap-node ${item.completed ? 'completed' : ''}`} style={{ left: `${cx}px`, top: `${cy}px` }}>
                      <button className="node-circle" onClick={() => toggleRoadmapItem(activeRoadmap.id, item.id)} title="Marcar/Desmarcar"></button>
                      <div className="node-card">
                        <button style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }} onClick={() => deleteRoadmapItem(activeRoadmap.id, item.id)}>✕</button>
                        <h3>{item.title}</h3>
                        {item.description && <p>{item.description}</p>}
                        <div className="node-links">
                          {item.siteUrl && <a href={item.siteUrl} target="_blank" rel="noreferrer">🔗 Site</a>}
                          {item.githubUrl && <a href={item.githubUrl} target="_blank" rel="noreferrer">💻 GitHub</a>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {!showForm ? (
              <button className="button ghost full-width add-node-btn" onClick={() => setShowForm(true)}>+ Adicionar Projeto</button>
            ) : (
              <form className="add-item-form" onSubmit={handleAddItem}>
                <input type="text" placeholder="Nome do Projeto" value={newItemName} onChange={e => setNewItemName(e.target.value)} required />
                <textarea placeholder="Descrição (opcional)" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
                <input type="url" placeholder="Link do Site (opcional)" value={newItemSite} onChange={e => setNewItemSite(e.target.value)} />
                <input type="url" placeholder="Link do GitHub (opcional)" value={newItemGithub} onChange={e => setNewItemGithub(e.target.value)} />
                <div className="form-actions">
                  <button type="button" className="button ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                  <button type="submit" className="button primary">Adicionar</button>
                </div>
              </form>
            )}
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
