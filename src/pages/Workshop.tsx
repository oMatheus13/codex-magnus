import { oficinaSections } from '../data/oficina'
import progressusBase from '../assets/vhs/Progressus Aeternus.png'
import progressusGlow from '../assets/vhs/Progressus Aeternus Brilho.png'
import corpusBase from '../assets/vhs/Corpus Potens.png'
import corpusGlow from '../assets/vhs/Corpus Potens Brilho.png'
import mensBase from '../assets/vhs/Mens Potens.png'
import mensGlow from '../assets/vhs/Mens Potens Brilho.png'
import actioBase from '../assets/vhs/Actio Suprema.png'
import actioGlow from '../assets/vhs/Actio Suprema Brilho.png'
import nexusBase from '../assets/vhs/Nexus Humanae.png'
import nexusGlow from '../assets/vhs/Nexus Humanae Brilho.png'
import opulentiaBase from '../assets/vhs/Opulentia Sapiens.png'
import opulentiaGlow from '../assets/vhs/Opulentia Sapiens Brilho.png'
import animaBase from '../assets/vhs/Anima Elevata.png'
import animaGlow from '../assets/vhs/Anima Elevata Brilho.png'
import voxBase from '../assets/vhs/Vox Nova.png'
import voxGlow from '../assets/vhs/Vox Nova Brilho.png'

const titleAssets: Record<string, { base: string; glow: string }> = {
  'progressus-aeternus': { base: progressusBase, glow: progressusGlow },
  'corpus-potens': { base: corpusBase, glow: corpusGlow },
  'mens-potens': { base: mensBase, glow: mensGlow },
  'actio-suprema': { base: actioBase, glow: actioGlow },
  'nexus-humanae': { base: nexusBase, glow: nexusGlow },
  'opulentia-sapiens': { base: opulentiaBase, glow: opulentiaGlow },
  'anima-elevata': { base: animaBase, glow: animaGlow },
  'vox-nova': { base: voxBase, glow: voxGlow },
}

export function Workshop() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Officina Virtutum</h1>
        <p>Catalogo de habitos, secoes e valores de solaris.</p>
      </header>
      <div className="workshop-list">
        {oficinaSections.map((section) => {
          const assets = titleAssets[section.latinKey]
          return (
            <section key={section.id} className="section-card">
              <div className="section-header">
                <div className="section-title">
                  {assets ? (
                    <div className="vhs-title">
                      <img
                        className="vhs-title-base"
                        src={assets.base}
                        alt={section.latin}
                      />
                      <img
                        className="vhs-title-glow"
                        src={assets.glow}
                        alt=""
                        aria-hidden="true"
                      />
                    </div>
                  ) : (
                    <div className="section-title-text">{section.latin}</div>
                  )}
                </div>
                <div className="section-meta">
                  <span className="section-name">{section.title}</span>
                  <span className="section-latin">{section.latin}</span>
                </div>
              </div>
              <div className="section-body">
                <ul className="section-habits">
                  {section.habits.map((habit) => (
                    <li key={habit.id} className="section-habit">
                      <span>{habit.label}</span>
                      <span className="section-points">+{habit.points}</span>
                    </li>
                  ))}
                </ul>
                {section.subSections.map((subSection) => (
                  <div key={subSection.id} className="section-subgroup">
                    <div className="section-subtitle">
                      {subSection.title}
                      <span className="section-subtitle-latin">
                        {subSection.latin}
                      </span>
                    </div>
                    <ul className="section-habits">
                      {subSection.habits.map((habit) => (
                        <li key={habit.id} className="section-habit">
                          <span>{habit.label}</span>
                          <span className="section-points">+{habit.points}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
