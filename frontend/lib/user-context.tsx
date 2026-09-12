"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface UserProfile {
  username: string
  displayName: string
  avatarUrl: string
  bio?: string
}

interface UserContextType {
  user: UserProfile | null
  isLoading: boolean
  login: (username: string, displayName: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
})

const STORAGE_KEY = "gitpulse_user_profile"

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setUser(JSON.parse(stored))
      }
    } catch {
      // Ignore storage errors
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = async (username: string, displayName: string) => {
    const cleanUsername = username.trim().replace(/^@/, "")
    const cleanDisplayName = displayName.trim() || cleanUsername

    if (!cleanUsername) {
      return { success: false, error: "Please enter your GitHub username." }
    }

    try {
      // Verify username with GitHub public API
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "GitPulse-Analytics-Dashboard/0.1.0",
        },
      })

      if (res.status === 404) {
        return { success: false, error: `GitHub user "${cleanUsername}" was not found.` }
      }

      if (!res.ok) {
        return { success: false, error: "Could not connect to GitHub. Please check your username and try again." }
      }

      const ghData = await res.json()

      const profile: UserProfile = {
        username: ghData.login,
        displayName: cleanDisplayName,
        avatarUrl: ghData.avatar_url || `https://github.com/${cleanUsername}.png`,
        bio: ghData.bio || undefined,
      }

      setUser(profile)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      // Also store in cookie for server-side compatibility
      document.cookie = `gitpulse_username=${encodeURIComponent(profile.username)}; path=/; max-age=2592000; SameSite=Lax`
      document.cookie = `gitpulse_display_name=${encodeURIComponent(profile.displayName)}; path=/; max-age=2592000; SameSite=Lax`

      return { success: true }
    } catch {
      return { success: false, error: "Network error while connecting to GitHub." }
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
    document.cookie = "gitpulse_username=; path=/; max-age=0"
    document.cookie = "gitpulse_display_name=; path=/; max-age=0"
    router.push("/")
  }

  return (
    <UserContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserProfile() {
  return useContext(UserContext)
}

