export {}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => {
        connect: () => Promise<boolean>
        disconnect: () => void
        addListener: (event: string, handler: (state: any) => void) => void
        removeListener: (event: string, handler?: (state: any) => void) => void
        getCurrentState: () => Promise<any>
        pause: () => Promise<void>
        resume: () => Promise<void>
        nextTrack: () => Promise<void>
        previousTrack: () => Promise<void>
        setVolume: (volume: number) => Promise<void>
      }
    }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}
