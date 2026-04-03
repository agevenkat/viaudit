import React from 'react';

interface CardProps {
  children:  React.ReactNode;
  className?: string;
  padding?:  'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
};

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-[var(--bg2)] border border-[var(--border)] rounded-xl ${paddings[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
