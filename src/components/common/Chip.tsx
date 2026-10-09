import type { ReactNode } from 'react';

interface Props {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  /** 'toggle' = 켜짐/꺼짐(점선), 'select' = 선택 시 진한 배경 */
  variant?: 'toggle' | 'select';
  ariaLabel?: string;
  className?: string;
}

export function Chip({ pressed, onClick, children, variant = 'toggle', ariaLabel, className = '' }: Props) {
  return (
    <button
      type="button"
      className={`chip chip--${variant} ${className}`}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
