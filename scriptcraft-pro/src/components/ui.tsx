import React from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sc-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sc-bg disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<ButtonVariant, string> = {
    primary:
      'btn-primary',
    ghost:
      'text-sc-text-muted hover:text-sc-text hover:bg-sc-accent-soft',
    subtle:
      'glass-panel text-sc-text hover:border-[color:var(--sc-border-strong)] hover:shadow-lg',
    destructive:
      'bg-red-500 text-white shadow-sm hover:bg-red-600',
  };

  const sizes: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-2',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-sm px-6 py-3.5',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({
  padded = true,
  className = '',
  ...props
}) => {
  const padding = padded ? 'p-4' : '';
  return (
    <div
      className={`glass-card gradient-border rounded-[1.25rem] ${padding} ${className}`}
      {...props}
    />
  );
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent';
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className = '', ...props }) => {
  const variants = {
    default: 'bg-sc-accent-soft text-sc-accent border border-sc-accent-soft-strong',
    accent: 'bg-sc-accent text-sc-text-inverse border border-transparent shadow-sm',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full text-xs font-medium px-3 py-1.5 ${variants[variant]} ${className}`}
      {...props}
    />
  );
};
