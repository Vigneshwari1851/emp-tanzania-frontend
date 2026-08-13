import React from 'react';
import { Clock, Target, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export function EmployeeDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80 bg-card">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              -- <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Attendance rate</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">--%</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">This month</p>
        </Card>
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80 bg-card">
          <div className="flex items-center justify-between mb-3">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-0.5">
              -- on track <CheckCircle2 className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Goals completed</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">--</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Q2 objectives</p>
        </Card>
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80 bg-card">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-amber-600 flex items-center gap-0.5">
              -- streak <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Current streak</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">--</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Consecutive days</p>
        </Card>
        <Card className="p-5 hover:shadow-sm transition-shadow duration-200 border-border/80 bg-card">
          <div className="flex items-center justify-between mb-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-[11px] font-medium text-rose-600 flex items-center gap-0.5">
              -- pending <TrendingUp className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Leaves taken</p>
          <p className="text-[24px] font-semibold text-foreground tabular-nums mt-1 tracking-tight">--</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">This year</p>
        </Card>
      </div>
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>Employee Action Center</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
            <p className="text-muted-foreground font-medium">Detailed widgets for Employee will go here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
