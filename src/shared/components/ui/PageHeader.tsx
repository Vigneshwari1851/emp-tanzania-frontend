import * as React from "react"
import { ChevronRight } from "lucide-react"

import { cn } from "@/shared/components/ui/utils"

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode
  description?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
  action?: React.ReactNode
  icon?: React.ReactNode
}

export function PageHeader({ title, description, breadcrumbs, action, icon, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6", className)} {...props}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
        )}
        <div className="space-y-1">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-1">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.label}>
                  {crumb.href ? (
                    <a href={crumb.href} className="hover:text-foreground transition-colors font-medium">
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                  {index < breadcrumbs.length - 1 && <ChevronRight className="h-4 w-4 mx-1" />}
                </React.Fragment>
              ))}
            </nav>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            {title}
          </h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="flex items-center space-x-2 shrink-0">{action}</div>}
    </div>
  )
}
