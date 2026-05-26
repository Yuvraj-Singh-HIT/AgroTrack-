import { Skeleton } from "@/components/ui/skeleton";

export function LoadingMapSkeleton() {
  return (
    <div className="space-y-6 w-full h-[calc(100vh-140px)] flex flex-col">
      {/* Top Header/Toolbar Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border border-muted/50 shadow-sm animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-muted/60" />
          <Skeleton className="h-4 w-72 bg-muted/60" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Skeleton className="h-9 flex-1 sm:w-32 bg-muted/60" />
          <Skeleton className="h-9 w-9 bg-muted/60" />
          <Skeleton className="h-9 w-9 bg-muted/60" />
        </div>
      </div>

      {/* Main Split Layout Skeleton */}
      <div className="grid gap-6 lg:grid-cols-4 flex-1 overflow-hidden">
        {/* Sidebar Controls Panel Skeleton */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="bg-card p-4 rounded-lg border border-muted/50 shadow-sm space-y-4">
              <Skeleton className="h-5 w-24 bg-muted/60" />
              <Skeleton className="h-9 w-full bg-muted/60" />
              <Skeleton className="h-9 w-full bg-muted/60" />
            </div>

            <div className="bg-card p-4 rounded-lg border border-muted/50 shadow-sm space-y-4">
              <Skeleton className="h-5 w-32 bg-muted/60" />
              <div className="grid grid-cols-2 gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 bg-muted/60" />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-lg border border-muted/50 shadow-sm space-y-4">
            <Skeleton className="h-4 w-full bg-muted/60" />
            <Skeleton className="h-3 w-3/4 bg-muted/60" />
          </div>
        </div>

        {/* Map Placeholder Skeleton */}
        <div className="lg:col-span-3 h-full rounded-lg border border-muted/70 shadow-md relative overflow-hidden flex items-center justify-center bg-muted/10">
          {/* Pulsing center marker simulation */}
          <div className="absolute flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/20 animate-ping absolute" />
            <div className="h-8 w-8 rounded-full bg-primary/45 border-4 border-background shadow-lg" />
          </div>

          {/* Map Base Tile Grid Simulation */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 gap-[1px] opacity-10 pointer-events-none">
            {[...Array(24)].map((_, i) => (
              <div key={i} className="border border-foreground/30" />
            ))}
          </div>

          {/* Floating Legend Skeleton */}
          <div className="absolute bottom-6 right-6 bg-card/85 p-3 rounded-lg border border-muted/70 shadow-lg space-y-2 w-44">
            <Skeleton className="h-4 w-20 bg-muted/60" />
            <Skeleton className="h-2 w-full rounded bg-gradient-to-r from-green-500 to-red-500" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-6 bg-muted/60" />
              <Skeleton className="h-3 w-6 bg-muted/60" />
            </div>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
