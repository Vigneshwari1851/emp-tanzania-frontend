import React, { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/Input";
import { Badge } from "@/shared/components/ui/Badge";
import { Switch } from "@/shared/components/ui/switch";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/Checkbox";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/shared/components/ui/Avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/components/ui/Tooltip";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Palette, Box, Layers, Component, Blocks } from "lucide-react";

export function DesignSystem() {
  const [activeTab, setActiveTab] = useState("foundations");

  const tabs = [
    { id: "foundations", label: "Foundations" },
    { id: "primitives", label: "UI Primitives" },
    { id: "composites", label: "Composite Patterns" },
  ];

  return (
    <div className="space-y-4 w-full min-w-0 font-sans text-foreground animate-in fade-in duration-300">
      <PageHeader 
        title="Design System" 
        description="Enterprise Component Hub"
        icon={<Palette className="size-8" />}
      />

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 w-full mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          let IconComponent = Palette;
          if (tab.id === "primitives") IconComponent = Component;
          else if (tab.id === "composites") IconComponent = Blocks;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group px-1 py-3 text-[13px] font-bold transition-all whitespace-nowrap border-b-2 select-none cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'text-primary border-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <IconComponent className={`w-4 h-4 transition-colors ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {activeTab === "foundations" && (
          <div className="space-y-8 animate-in fade-in duration-500">
              <Card>
                <CardHeader>
                  <CardTitle>Color Palette</CardTitle>
                  <CardDescription>Semantic color tokens mapped to enterprise theme variables</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <div className="h-16 w-full rounded-md bg-primary border" />
                      <p className="text-xs font-semibold">Primary</p>
                      <p className="text-[10px] text-muted-foreground">bg-primary</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-16 w-full rounded-md bg-secondary border" />
                      <p className="text-xs font-semibold">Secondary</p>
                      <p className="text-[10px] text-muted-foreground">bg-secondary</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-16 w-full rounded-md bg-muted border" />
                      <p className="text-xs font-semibold">Muted</p>
                      <p className="text-[10px] text-muted-foreground">bg-muted</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-16 w-full rounded-md bg-destructive border" />
                      <p className="text-xs font-semibold">Destructive</p>
                      <p className="text-[10px] text-muted-foreground">bg-destructive</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Typography</CardTitle>
                  <CardDescription>Standardized font scales (Inter)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Heading 1 (24px)</h1>
                    <p className="text-sm text-muted-foreground">Use for main page titles.</p>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight">Heading 2 (18px)</h2>
                    <p className="text-sm text-muted-foreground">Use for card titles and sub-sections.</p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Heading 3 (16px)</h3>
                    <p className="text-sm text-muted-foreground">Use for inner components and widgets.</p>
                  </div>
                  <div>
                    <p className="text-sm font-normal">Body text (14px). The standard font size for all paragraphs and readable content in the application.</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Micro text (12px). Used for timestamps, hints, and meta information.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "primitives" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PageHeader 
                title="UI Primitives" 
                description="Core building blocks for creating interfaces. Based on Radix UI for accessibility."
                icon={<Box className="size-8" />}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Buttons */}
                <Card>
                  <CardHeader>
                    <CardTitle>Buttons</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      <Button variant="primary">Primary</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <Button variant="danger">Destructive</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="cancel">Link</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Forms */}
                <Card>
                  <CardHeader>
                    <CardTitle>Forms & Inputs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input type="email" placeholder="name@company.com" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="terms" />
                      <label htmlFor="terms" className="text-sm font-medium">Accept terms and conditions</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch id="airplane" />
                      <label htmlFor="airplane" className="text-sm font-medium">Enable notifications</label>
                    </div>
                  </CardContent>
                </Card>

                {/* Avatar & Tooltip */}
                <Card>
                  <CardHeader>
                    <CardTitle>Avatar & Tooltip</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-8 items-center">
                    <Avatar>
                      <AvatarImage src="https://github.com/shadcn.png" />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline">Hover me</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Add to library</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </CardContent>
                </Card>

                {/* Skeleton */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skeleton (Loading)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "composites" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PageHeader 
                title="Composite Patterns" 
                description="Complex layout structures combining multiple primitives."
                icon={<Layers className="size-8" />}
              />
              
              <Card>
                <CardHeader>
                  <CardTitle>Page Header Pattern</CardTitle>
                  <CardDescription>Standard header for all main views</CardDescription>
                </CardHeader>
                <CardContent className="bg-muted/30 p-6 rounded-md border mt-2">
                  <PageHeader 
                    title="Employee Directory"
                    description="Manage all active employees in your organization."
                    breadcrumbs={[
                      { label: "Dashboard", href: "#" },
                      { label: "Employees" }
                    ]}
                    action={
                      <Button>Add Employee</Button>
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dense DataGrid Pattern</CardTitle>
                  <CardDescription>Standardized table structure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>SC</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium">Sarah Connor</div>
                                <div className="text-xs text-muted-foreground">sarah@company.com</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>Lead Engineer</TableCell>
                          <TableCell><Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Active</Badge></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

      </div>
    </div>
  );
}
