import { cn } from "@/lib/utils"

interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  keys: string[]
}

export function Kbd({ keys, className, ...props }: KbdProps) {
  return (
    <kbd className={cn("inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground", className)} {...props}>
      {keys.map((key, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-[3px] bg-muted border border-border shadow-xs"
        >
          {key}
        </span>
      ))}
    </kbd>
  )
}
