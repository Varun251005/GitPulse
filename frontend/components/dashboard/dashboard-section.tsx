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
    <Card className="col-span-1 shadow-sm border-neutral-800 bg-neutral-950/80">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold text-white">{title}</CardTitle>
          {description && <CardDescription className="text-xs text-neutral-400">{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
