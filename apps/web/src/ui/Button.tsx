import type { ButtonHTMLAttributes, ReactElement } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE =
  'inline-flex items-center justify-center gap-dr-xs rounded-dr-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-dr-sm py-dr-xs text-dr-caption',
  md: 'px-dr-md py-dr-xs text-dr-small',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-dr-accent text-dr-on-accent shadow-dr-sm hover:bg-dr-accent-hover',
  secondary:
    'border border-dr-border-strong bg-dr-panel-raised text-dr-text hover:bg-dr-panel-hover',
  danger:
    'border border-dr-border-strong bg-dr-panel-raised text-dr-danger hover:border-dr-danger hover:bg-dr-panel-hover',
  ghost: 'border border-transparent text-dr-muted hover:bg-dr-panel-hover hover:text-dr-text',
};

/** Shared button primitive establishing a clear action hierarchy across the review UI. */
export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps): ReactElement {
  const classes = [BASE, SIZE_CLASSES[size], VARIANT_CLASSES[variant], className]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} type={type} {...rest} />;
}
