/** Som de notificação do chat (novas mensagens). */

const SOUND_SRC = "/som/somNotidication.mp3"
const STORAGE_KEY = "seke:chat-sound"
/** Evita repetir o som quando chegam várias mensagens ao mesmo tempo. */
const MIN_GAP_MS = 1200

let audio: HTMLAudioElement | null = null
let lastPlayedAt = 0
/** true quando o áudio já foi desbloqueado por um gesto do utilizador. */
let unlocked = false

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null
  if (!audio) {
    audio = new Audio(SOUND_SRC)
    audio.preload = "auto"
    audio.volume = 0.6
  }
  return audio
}

/** Preferência do utilizador (som ligado por omissão). */
export function isChatSoundEnabled(): boolean {
  if (typeof window === "undefined") return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off"
  } catch {
    return true
  }
}

const soundListeners = new Set<() => void>()

/** Subscrição da preferência (para `useSyncExternalStore`). */
export function subscribeChatSound(listener: () => void): () => void {
  soundListeners.add(listener)
  return () => {
    soundListeners.delete(listener)
  }
}

/** Snapshot no cliente; no servidor assume-se ligado. */
export function getChatSoundSnapshot(): boolean {
  return isChatSoundEnabled()
}

export function getChatSoundServerSnapshot(): boolean {
  return true
}

export function setChatSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off")
  } catch {
    // localStorage indisponível (modo privado) — mantém o som ligado.
  }
  soundListeners.forEach((listener) => listener())
}

/**
 * Desbloqueia o áudio no primeiro gesto do utilizador. Os navegadores só
 * permitem reprodução depois de uma interacção; sem isto o primeiro som
 * poderia ser silenciado pela política de autoplay.
 */
export function primeChatNotificationSound(): void {
  if (typeof window === "undefined" || unlocked) return
  const el = getAudio()
  if (!el) return

  unlocked = true
  const volume = el.volume
  el.volume = 0

  const played = el.play()
  if (!played) {
    unlocked = false
    el.volume = volume
    return
  }

  void played
    .then(() => {
      el.pause()
      el.currentTime = 0
      el.volume = volume
    })
    .catch(() => {
      unlocked = false
      el.volume = volume
    })
}

/** Regista os gestos que desbloqueiam o áudio (uma única vez). */
export function initChatNotificationSound(): void {
  if (typeof window === "undefined") return

  primeChatNotificationSound()

  const unlock = () => primeChatNotificationSound()
  window.addEventListener("pointerdown", unlock, { once: true, passive: true })
  window.addEventListener("keydown", unlock, { once: true })
}

/** Toca o som de nova mensagem (respeita a preferência e o autoplay). */
export function playChatNotificationSound(): void {
  if (!isChatSoundEnabled()) return

  const el = getAudio()
  if (!el) return

  const now = Date.now()
  if (now - lastPlayedAt < MIN_GAP_MS) return
  lastPlayedAt = now

  try {
    el.currentTime = 0
    void el.play().catch(() => {
      // Bloqueado pelo navegador: tenta novamente no próximo gesto.
      unlocked = false
    })
  } catch {
    unlocked = false
  }
}
