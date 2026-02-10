# Codex Magnus - Visao Geral e Regras

## Visao geral
Codex Magnus e um app pessoal de gamificacao de rotina com visual retro anos 80 VHS, inspirado em jogos de tabuleiro classicos. O foco e uso diario rapido e individual, com feedback visual em um tabuleiro 2D animado.

Nao e um jogo competitivo. E um sistema de rotina com comportamento e feedback de jogo.

## Principios do projeto
- Comecar com tabuleiro simples e funcional e evoluir visual e mecanicas depois.
- Priorizar uso diario rapido.
- Evitar engines completas de jogo (Unity, Godot).
- Base unica para mobile (Capacitor) e desktop (Tauri).

## Stack e arquitetura
- React para UI, menus e telas.
- PixiJS para tabuleiro e animacoes 2D (WebGL).
- Canvas Pixi integrado a interface React.
- Animacoes por codigo (ticker/requestAnimationFrame).
- Camera com zoom, pan e centralizacao.
- Codigo modular, separando logica e visual.

## Estilo visual
- Estetica retro 80s, VHS, neon, retrowave, vapowave.
- Scanlines, ruido leve, glow discreto.
- Paleta limitada e tipografia estilo retro.

## Elementos principais do sistema
1) Oficina Virtutum: tabela onde habitos e tarefas sao registrados.
2) Iter Vitus: tabuleiro de progresso.
3) Memoriam Victoriae: album de conquistas.
4) Solaris: moeda do jogo.

## Fluxo diario (alto nivel)
- Na Home, o usuario marca habitos concluidos.
- Cada habito concluido gera 1 Solaris (ou mais, dependendo da regra do habito).
- O tipo de Solaris (manha/tarde/noite) depende do horario da conclusao.
- No fim de cada turno (manha, tarde, noite), os Solaris acumulados sao usados como moeda para comprar dados D6.
- Cada dado comprado permite um avanco no Iter Vitus, tornando o progresso mais controlado e evitando um tabuleiro gigante.

## Turnos
- Tres turnos: manha, tarde e noite.
- O sistema identifica o horario da conclusao para atribuir o tipo de Solaris.

## Oficina Virtutum (habitos)
- Habitos organizados por secoes e sub-secoes.
- Cada habito tem um valor de 1 a 3 Solaris conforme dificuldade/importancia.
- Ha tambem habitos fixos, sazonais e tarefas extras:
  - Fixos (diarios): 1 Solaris.
  - Sazonais (semanais/mensais): 2 a 5 Solaris.
  - Extras/Missoes: Solaris adicionais ou bonus secretos.

## Solaris (moeda do jogo)
- Tres tipos: manha, tarde, noite.
- Cada tipo tem efeito especial (a definir).
- Solaris sao usados para comprar dados de avanço e itens na lojinha.

## Iter Vitus (tabuleiro)
- Tabuleiro organico e infinito, em loop, com curvas e bifurcacoes.
- Composto por zonas tematicas com identidade visual e mecanicas associadas.
- Caminhos com escolhas estrategicas, atalhos, bonus e desafios.
- Checkpoints e ciclos para sinalizar fases e recompensas.

### Zonas tematicas
1) Sapientia (Desenvolvimento Pessoal)
   - Cor: dourado/azul royal
   - Elementos: livros, engrenagens, feixes de luz
2) Corpus (Saude Fisica)
   - Cor: vermelho/verde vibrante
   - Elementos: halteres, energia, movimento
3) Mens (Saude Mental)
   - Cor: roxo/azul claro
   - Elementos: cerebro, ondas, espirais
4) Productivitas (Produtividade)
   - Cor: laranja/amarelo
   - Elementos: relogios, calendarios, checklists
5) Nexus Humanae (Relacionamentos)
   - Cor: rosa/vermelho suave
   - Elementos: coracoes, maos dadas, lacos
6) Opes (Financeiro)
   - Cor: verde escuro/preto
   - Elementos: moedas, cofres, ouro
7) Spiritus (Espiritualidade)
   - Cor: branco/azul celestial
   - Elementos: chamas, estrelas, feixes divinos

## Regras do tabuleiro
- Avanco ocorre tres vezes ao dia (fim de cada turno)(é enviado uma notificação ao usuario para avançar no tabuleiro).
- Solaris do turno podem ser gastos em dados D6 para avancar no tabuleiro.
- Casas podem conter bonus (avancos extras, recompensas) ou desafios (tarefas especificas).
- Dificuldade dos desafios aumenta ao longo da semana.
- Sabado e dia de checkpoint para revisar o progresso.

### Dificuldades de desafios
- Gradus Novitius (facil)
- Gradus Medius (medio)
- Gradus Magnus (dificil)
- Gradus Extremus (extremo, com recompensas especiais)

### Tipos de desafios
- Fisicos, mentais, produtivos, sociais e espirituais.

## Trilha de habitos (perfeicao)
- Usuario escolhe um habito especifico para executar sem falhas.
- Ele pode escolher o habito, a quantidade de dias para a conclusão dele.
- Ao completar 100% perfeito, ganha uma conquista.
- A conquista vira figurinha que pode ser colada no album.

## Memoriam Victoriae (album de conquistas)
- Album de conquistas com adesivos tematicos vaporwave/futurista.
- Conquistas seguem as categorias da Oficina Virtutum.
- Conquistas extremas tem adesivos holograficos.
- Album e reiniciado ou expandido anualmente.

### Exemplos de conquistas
- Desenvolvimento pessoal: 30 dias seguidos de leitura.
- Saude fisica: bater meta de peso ou forca.
- Financeiro: atingir valor na reserva de emergencia.

## Multiplicadores e mecanicas extras
- Dado personalizado: dados D6 comprados com Solaris Manhã.
- Dado personalizado: dados D8 comprados com Solaris Tarde.
- Dado personalizado: dados D10 comprados com Solaris Noite.
- Bonus de consistencia: completar o mesmo habito por X dias seguidos gera bonus.
- Desafios diarios e semanais: completar conjuntos especificos gera bonus.
- Bonus de sequencia: apos 5 dias seguidos, habito vale +1 Solaris.
- Cartao de ouro: completar 80% dos habitos da semana gera +5 Solaris.

## Pendencias para definir
- Efeitos especiais de cada tipo de Solaris.
- Regras detalhadas de atalhos, bonus e desafios no tabuleiro.
- Criterios finais de pontuacao por habito (manual vs. automatica).
