import { Spinner } from "./spinner"
import { cn } from "@/lib/utils"

interface LoadingProps {
  /** Texto a ser exibido durante o carregamento */
  message?: string
  /** Tamanho do spinner: sm, md, lg */
  size?: "sm" | "md" | "lg"
  /** Se deve mostrar como overlay (tela cheia) ou inline */
  variant?: "overlay" | "inline" | "skeleton"
  /** Classes adicionais */
  className?: string
  /** Para variant skeleton: número de itens skeleton */
  skeletonCount?: number
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

export function Loading({
  message = "Carregando...",
  size = "md",
  variant = "inline",
  className,
  skeletonCount = 3,
}: LoadingProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("animate-pulse space-y-4", className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    )
  }

  if (variant === "overlay") {
    return (
      <div className={cn("fixed inset-0 bg-[#F6EEE8]/80 backdrop-blur-sm flex items-center justify-center z-50", className)}>
        <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center gap-4">
          <Spinner className={sizeClasses[size]} />
          {message && <p className="text-gray-600 font-medium">{message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center gap-3 py-8", className)}>
      <Spinner className={sizeClasses[size]} />
      {message && <p className="text-gray-600">{message}</p>}
    </div>
  )
}

/** Loading para páginas completas */
export function PageLoading({ message = "Carregando..." }: { message?: string }) {
  return (
    <main className="min-h-screen bg-[#F6EEE8] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 flex flex-col items-center gap-4 max-w-md w-full">
        <Spinner className="h-8 w-8" />
        <p className="text-gray-600 font-medium text-center">{message}</p>
      </div>
    </main>
  )
}

/** Loading skeleton para listas */
export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-24 ml-4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Loading skeleton para cards em grid */
export function GridSkeleton({ count = 6, cols = 3 }: { count?: number; cols?: number }) {
  const gridCols = cols === 2 ? "lg:grid-cols-2" : cols === 3 ? "lg:grid-cols-3" : cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-4 sm:gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-full">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

