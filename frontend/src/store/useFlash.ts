import { create } from 'zustand'

type Variant = 'success' | 'error' | 'info'
type FlashState = {
  message: string | null
  variant: Variant
  show: (msg: string, variant?: Variant, durationMs?: number) => void
  hide: () => void
}

export const useFlash = create<FlashState>((set) => ({
  message: null,
  variant: 'success',
  show: (msg, variant = 'success', durationMs = 3000) => {
    set({ message: msg, variant })
    if (durationMs > 0) {
      setTimeout(() => set({ message: null }), durationMs)
    }
  },
  hide: () => set({ message: null }),
}))
