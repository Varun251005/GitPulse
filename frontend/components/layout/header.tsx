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
      <div className="w-full flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 md:px-8">
        <div className="flex items-center gap-2 sm:gap-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center rounded-lg bg-primary p-1.5 shadow-sm shrink-0">
              <GitBranch className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight font-mono">GitPulse</span>
          </Link>
          <span className="hidden lg:inline-block text-xs text-muted-foreground border-l border-border pl-4">
            GitHub Repository Analytics
          </span>

          <nav className="flex items-center gap-2 sm:gap-4 ml-1 sm:ml-2">
            <Link
              href="/"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-md hover:bg-neutral-900"
            >
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline sm:inline">Home</span>
            </Link>
            {currentUser && (
              <Link
                href="/repos"
                className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-md hover:bg-neutral-900"
              >
                <FolderGit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">Repositories</span>
              </Link>
            )}
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {isUserLoading ? (
            <div className="h-8 w-20 sm:h-9 sm:w-24 bg-muted animate-pulse rounded-md" />
          ) : currentUser ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:p-1.5 rounded-full hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-neutral-800 bg-neutral-900/60"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                {currentUser.image ? (
                  <Image
                    src={currentUser.image}
                    alt={currentUser.name || "User avatar"}
                    width={26}
                    height={26}
                    className="rounded-full ring-1 ring-border sm:w-[30px] sm:h-[30px]"
                  />
                ) : (
                  <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium text-xs">
                    {currentUser.name?.[0]?.toUpperCase() || <UserIcon className="h-3.5 w-3.5" />}
                  </div>
                )}
                <span className="text-xs sm:text-sm font-medium hidden sm:inline-block max-w-[120px] truncate pr-1">
                  {currentUser.name}
                </span>
                <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 sm:w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-neutral-800 bg-neutral-950 p-1.5 text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 z-50 font-mono">
                  <div className="px-3 py-2 border-b border-neutral-800 mb-1">
                    <p className="text-sm font-semibold truncate text-white">{currentUser.name}</p>
                    {currentUser.username && (
                      <p className="text-xs text-neutral-400 truncate">@{currentUser.username}</p>
                    )}
                    {currentUser.email && (
                      <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                    )}
                  </div>

                  <Link
                    href="/repos"
                    onClick={() => setDropdownOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs sm:text-sm hover:bg-neutral-900 transition-colors text-neutral-200"
                  >
                    <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                    My Repositories
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs sm:text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild size="sm" className="gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3">
              <Link href="/login">
                <GithubIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                <span className="hidden xs:inline">Sign in</span>
                <span className="xs:hidden">Login</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
