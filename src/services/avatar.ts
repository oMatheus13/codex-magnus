import { supabase } from './supabase'

export const AVATAR_BUCKET = 'Codex Files'
const AVATAR_SIGNED_URL_TTL = 60 * 60

export async function getAvatarSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_URL_TTL)

  if (error) {
    throw error
  }

  return data.signedUrl
}
