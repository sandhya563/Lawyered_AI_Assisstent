'use client'

import { create } from 'zustand'

interface User {
  id: string
  email: string
  fullName?: string
}

interface AuthState {
  token: string | null
  user: User | null
  isHydrated: boolean
  setAuth: (token: string, user: User) => void
  logout: () => void
  hydrate: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isHydrated: false,
  setAuth: (token: string, user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
    }
    set({ token, user })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    set({ token: null, user: null })
  },
  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : null
      set({ token, user, isHydrated: true })
    }
  },
}))
