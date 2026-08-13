import React from "react";
import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-sm fixed inset-0 z-50">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading module...</p>
      </div>
    </div>
  );
}
