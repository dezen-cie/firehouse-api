import { create } from 'zustand'

type SetterArg = number | ((prev:number)=>number)

type BadgesStore = {
  messages: number
  files: number
  setMessages: (v: SetterArg) => void
  setFiles: (v: SetterArg) => void
  resetFiles: () => void
}

export const useBadges = create<BadgesStore>((set) => ({
  messages: 0,
  files: 0,
  setMessages: (v) => set((s)=>({ messages: typeof v==='function' ? (v as any)(s.messages) : v })),
  setFiles: (v) => set((s)=>({ files: typeof v==='function' ? (v as any)(s.files) : v })),
  resetFiles: () => set({ files: 0 }),
}))
