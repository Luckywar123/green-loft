interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export default function Button({
  children,
  variant = 'primary',
  onClick,
  disabled,
  className = ''
}: ButtonProps) {
  const baseClasses = 'px-6 py-3 rounded-lg font-semibold transition-colors'
  const variantClasses = variant === 'primary'
    ? 'bg-[#4CAF50] text-white hover:bg-[#45a049]'
    : 'bg-white text-[#333333] border border-[#333333] hover:bg-gray-50'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}