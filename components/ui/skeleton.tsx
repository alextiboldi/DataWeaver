import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-neutral-200 animate-pulse rounded-none", className)}
      {...props}
    />
  )
}

export { Skeleton }
