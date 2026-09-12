import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card"

interface DashboardSectionProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function DashboardSection({ title, description, action, children }: DashboardSectionProps) {
  return (
    <Card className="col-span-1 shadow-sm border-neutral-800 bg-neutral-950/80 rounded-xl sm:rounded-2xl font-mono">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 space-y-0 p-4 sm:p-6 pb-2 sm:pb-3">
        <div className="space-y-0.5 sm:space-y-1">
          <CardTitle className="text-sm sm:text-base font-bold text-white">{title}</CardTitle>
          {description && <CardDescription className="text-[11px] sm:text-xs text-neutral-400 font-sans">{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0 self-start sm:self-auto">{action}</div>}
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
        {children}
      </CardContent>
    </Card>
  )
}
