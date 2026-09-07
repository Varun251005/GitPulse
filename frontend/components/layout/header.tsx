import { GitBranch } from "lucide-react"
import Link from "next/link"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="flex items-center gap-2 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex items-center justify-center rounded-md bg-primary p-1">
              <GitBranch className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">GitPulse</span>
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline-block ml-2 border-l border-border pl-2">
            GitHub Repository Analytics
          </span>
        </div>
      </div>
    </header>
  )
}

