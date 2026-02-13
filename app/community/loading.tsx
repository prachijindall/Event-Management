import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function CommunityLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      {/* Header Skeleton */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8" />
              <Skeleton className="w-24 h-6" />
            </div>
            <Skeleton className="w-20 h-8" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left Sidebar Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
                <Skeleton className="w-24 h-6 mx-auto mb-2" />
                <Skeleton className="w-32 h-4 mx-auto mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Skeleton className="w-8 h-6 mx-auto mb-1" />
                    <Skeleton className="w-12 h-3 mx-auto" />
                  </div>
                  <div>
                    <Skeleton className="w-8 h-6 mx-auto mb-1" />
                    <Skeleton className="w-12 h-3 mx-auto" />
                  </div>
                  <div>
                    <Skeleton className="w-8 h-6 mx-auto mb-1" />
                    <Skeleton className="w-12 h-3 mx-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="w-full h-12" />
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="w-48 h-4" />
                      <Skeleton className="w-full h-20" />
                      <Skeleton className="w-full h-48" />
                      <div className="flex gap-4">
                        <Skeleton className="w-16 h-8" />
                        <Skeleton className="w-16 h-8" />
                        <Skeleton className="w-16 h-8" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Right Sidebar Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="w-32 h-6" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="w-24 h-4" />
                      <Skeleton className="w-20 h-3" />
                    </div>
                    <Skeleton className="w-16 h-8" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
