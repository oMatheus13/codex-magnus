export type PlaylistConfig = {
  id: string
  name: string
  basePath: string
  files: string[]
}

export const playlists: PlaylistConfig[] = [
  {
    id: 'qcn-retrowave',
    name: 'QCN - Retrowave Synthwave City Pop Future Funk',
    basePath: '/audio/QCN - Retrowave   Synthwave   City Pop   Future Funk',
    files: [
      'Beckett%20-%20Crush.mp3',
      'Beckett%20-%20Play.mp3',
      'FM%20Attack%20-%20Footprints.mp3',
      'FM%20Attack%20-%20Images%20of%20You.mp3',
      'FM%20Attack%20-%20Magic%20%28feat.%20Kristine%29.mp3',
      'FOR%C3%8AT%20DE%20VIN%20-%20Hold%20The%20Night%20%28feat.%20Robert%20Beachgrove%29.mp3',
      'Stay%20With%20Me.mp3',
      '%5BNu%20Disco%5D%20-%20Televisor%20-%20Alliance%20%5BMonstercat%20Release%5D.mp3',
      '%5BNu%20Disco%5D%20-%20Televisor%20-%20Dangerous%20%28feat.%20Danyka%20Nadeau%29%20%5BMonstercat%20Release%5D.mp3',
      '%5BNu%20Disco%5D%20-%20Televisor%20-%20Neon%20%5BMonstercat%20Release%5D.mp3',
      '%5BNu%20Disco%5D%20-%20Televisor%20-%20Old%20Skool%20%5BMonstercat%20Release%20%2B%20Remix%20Competition%5D.mp3',
    ],
  },
]
