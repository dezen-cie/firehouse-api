import { create } from 'zustand'

type User = { id:number, role:'user'|'admin'|'super_admin', firstName:string, lastName:string, grade?:string, avatarUrl?:string, visibleInList?:boolean } | null

export const useUser = create<{ user: User, setUser:(u:User)=>void, clear:()=>void }>(set=>({
  user: null,
  setUser: (u)=>set({ user: u }),
  clear: ()=>set({ user: null })
}))
