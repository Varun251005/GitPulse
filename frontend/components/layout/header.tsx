"use client"

import { useState, useRef, useEffect } from "react"
import { GitBranch, LogOut, ChevronDown, FolderGit2, Home, User as UserIcon } from "lucide-react"
import { GithubIcon } from "@/frontend/components/icons/github-icon"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useUserProfile } from "@/frontend/lib/user-context"
import { Button } from "@/frontend/components/ui/button"
import Image from "next/image"

export function Header() {
  const { data: session } = useSession()
  const { user, isLoading: isUserLoading, logout } = useUserProfile()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Current active user (custom profile preferred, fallback to next-auth session)
  const currentUser = user
    ? {
        name: user.displayName,
        username: user.username,
        image: user.avatarUrl,
        email: undefined,
      }
    : session?.user
    ? {
        name: session.user.name || "GitHub User",
        username: (session.user as { username?: string }).username || session.user.name || "user",
        image: session.user.image,
        email: session.user.email || undefined,
      }
    : null

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = () => {
    setDropdownOpen(false)
    if (user) {
      logout()
    } else {
      signOut({ callbackUrl: "/" })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center rounded-lg bg-primary p-1.5 shadow-sm">
              <GitBranch className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight font-mono">GitPulse</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline-block border-l border-border pl-4">
            GitHub Repository Analytics
          </span>

          <nav className="hidden md:flex items-center gap-4 ml-2">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
            {currentUser && (
              <Link
                href="/repos"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
              >
                <FolderGit2 className="h-4 w-4" />
                My Repositories
              </Link>
            )}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {isUserLoading ? (
            <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
          ) : currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-neutral-800 bg-neutral-900/60"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                {currentUser.image ? (
                  <Image
                    src={currentUser.image}
                    alt={currentUser.name || "User avatar"}
                    width={30}
                    height={30}
                    className="rounded-full ring-1 ring-border"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                    {currentUser.name?.[0]?.toUpperCase() || <UserIcon className="h-4 w-4" />}
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:inline-block max-w-[140px] truncate pr-1">
                  {currentUser.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline-block" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-neutral-800 bg-neutral-950 p-1.5 text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 z-50">
                  <div className="px-3 py-2 border-b border-neutral-800 mb-1">
                    <p className="text-sm font-semibold truncate text-white">{currentUser.name}</p>
                    {currentUser.username && (
                      <p className="text-xs text-neutral-400 font-mono truncate">@{currentUser.username}</p>
                    )}
                    {currentUser.email && (
                      <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                    )}
                  </div>

                  <Link
                    href="/repos"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-neutral-900 transition-colors text-neutral-200"
                  >
                    <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                    My Repositories
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild size="sm" className="gap-2 font-mono">
              <Link href="/login">
                <GithubIcon className="h-4 w-4 fill-current" />
                Sign in with GitHub
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

