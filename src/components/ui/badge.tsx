import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variants: Record<string, string> = {
      default: 'bg-blue-100 text-blue-800 border-transparent hover:bg-blue-200',
      secondary: 'bg-gray-100 text-gray-800 border-transparent hover:bg-gray-200',
      outline: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
      destructive: 'bg-red-100 text-red-800 border-transparent hover:bg-red-200',
    }
    
    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${variants[variant]} ${className}`}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'
