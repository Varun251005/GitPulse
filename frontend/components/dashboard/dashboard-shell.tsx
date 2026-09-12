import { ReactNode } from "react"

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      {children}
    </div>
  )
}

