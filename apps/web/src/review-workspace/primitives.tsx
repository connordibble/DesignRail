import type { ReactElement, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { cx, getToneBackgroundClass, getToneTextClass, type Tone } from './workspace-tones.js';

interface PanelProps {
  children: ReactNode;
  title: string;
  className?: string;
  density?: 'regular' | 'compact';
}

export function Panel({
  children,
  title,
  className,
  density = 'regular',
}: PanelProps): ReactElement {
  const isCompact = density === 'compact';

  return (
    <section className={cx('min-w-0 rounded-dr-lg border border-dr-border bg-dr-panel', className)}>
      <div
        className={cx(
          'border-b border-dr-border',
          isCompact ? 'px-dr-sm py-dr-xs' : 'px-dr-md py-dr-sm',
        )}
      >
        <h2
          className={cx(
            'font-semibold text-dr-text',
            isCompact ? 'text-dr-small' : 'text-dr-section-title',
          )}
        >
          {title}
        </h2>
      </div>
      <div className={isCompact ? 'p-dr-sm' : 'p-dr-md'}>{children}</div>
    </section>
  );
}

interface StatusBadgeProps {
  label: string;
  tone: Tone;
}

export function StatusBadge({ label, tone }: StatusBadgeProps): ReactElement {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-dr-xxs rounded-dr-xs border border-dr-border bg-dr-panel-raised px-dr-xs py-dr-xxs text-dr-caption font-semibold',
        getToneTextClass(tone),
      )}
    >
      <StatusDot tone={tone} />
      {label}
    </span>
  );
}

interface MetaTagProps {
  label: string;
  tone?: Tone;
}

export function MetaTag({ label, tone = 'neutral' }: MetaTagProps): ReactElement {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-dr-xs border border-dr-border bg-dr-shell px-dr-xs py-dr-xxs text-dr-caption font-medium',
        getToneTextClass(tone),
      )}
    >
      {label}
    </span>
  );
}

interface StatusDotProps {
  tone: Tone;
}

export function StatusDot({ tone }: StatusDotProps): ReactElement {
  return (
    <span aria-hidden="true" className={cx('size-2 rounded-full', getToneBackgroundClass(tone))} />
  );
}

interface EmptyLineProps {
  text: string;
}

export function EmptyLine({ text }: EmptyLineProps): ReactElement {
  return <p className="text-dr-small text-dr-subtle">{text}</p>;
}

interface InlineAlertProps {
  message: string;
  title: string;
}

export function InlineAlert({ message, title }: InlineAlertProps): ReactElement {
  return (
    <div className="rounded-dr-sm border border-dr-danger bg-dr-panel-raised p-dr-sm" role="alert">
      <p className="text-dr-caption font-semibold text-dr-danger">{title}</p>
      <p className="mt-dr-xxs text-dr-small text-dr-muted">{message}</p>
    </div>
  );
}

interface InlineNoticeProps {
  message: string;
  title: string;
  tone: Tone;
}

export function InlineNotice({ message, title, tone }: InlineNoticeProps): ReactElement {
  return (
    <div className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm">
      <p className={cx('text-dr-caption font-semibold', getToneTextClass(tone))}>{title}</p>
      <p className="mt-dr-xxs text-dr-small text-dr-muted">{message}</p>
    </div>
  );
}

export function BrandMark(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center gap-1 rounded-dr-sm border border-dr-border bg-dr-panel-raised"
    >
      <span className="h-4 w-px rounded bg-dr-border-strong" />
      <span className="size-1.5 rounded-full bg-dr-accent" />
      <span className="h-4 w-px rounded bg-dr-border-strong" />
    </span>
  );
}

interface CopyButtonProps {
  label: string;
  value: string;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

export function CopyButton({ label, value }: CopyButtonProps): ReactElement {
  const [status, setStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    if (status === 'idle') {
      return;
    }

    const timeoutId = setTimeout(() => setStatus('idle'), 2000);

    return () => clearTimeout(timeoutId);
  }, [status]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setStatus('copied');
    } catch {
      // Clipboard access can be denied by the browser; content remains manually selectable.
      setStatus('failed');
    }
  }

  return (
    <button
      aria-label={label}
      className="shrink-0 text-dr-caption font-medium text-dr-accent"
      onClick={handleCopy}
      type="button"
    >
      {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy'}
    </button>
  );
}

interface DefinitionListProps {
  items: Array<[string, string]>;
}

export function DefinitionList({ items }: DefinitionListProps): ReactElement {
  return (
    <dl className="grid gap-dr-xs">
      {items.map(([label, value]) => (
        <div className="grid gap-dr-xxs sm:grid-cols-[9rem_minmax(0,1fr)]" key={label}>
          <dt className="text-dr-caption font-medium text-dr-subtle">{label}</dt>
          <dd className="min-w-0 break-words font-mono text-dr-caption text-dr-muted">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface PillGroupProps {
  label: string;
  values: string[];
}

export function PillGroup({ label, values }: PillGroupProps): ReactElement {
  return (
    <div>
      <p className="text-dr-caption font-medium text-dr-subtle">{label}</p>
      <div className="mt-dr-xs flex flex-wrap gap-dr-xs">
        {values.map((value) => (
          <span
            className="rounded-dr-xs bg-dr-panel-raised px-dr-xs py-dr-xxs font-mono text-dr-caption text-dr-muted"
            key={value}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

interface TokenListProps {
  tokens: Array<{ name: string; target: string | null; value: string | null }>;
}

export function TokenList({ tokens }: TokenListProps): ReactElement {
  if (tokens.length === 0) {
    return <EmptyLine text="No tokens recorded." />;
  }

  return (
    <div>
      <p className="text-dr-caption font-medium text-dr-subtle">Tokens</p>
      <ul className="mt-dr-xs divide-y divide-dr-border rounded-dr-sm border border-dr-border">
        {tokens.map((token) => (
          <li
            className="flex items-center justify-between gap-dr-sm px-dr-sm py-dr-xs"
            key={token.name}
          >
            <span className="min-w-0 break-words font-mono text-dr-caption text-dr-text">
              {token.name}
            </span>
            <span className="font-mono text-dr-caption text-dr-subtle">
              {token.target ?? token.value ?? 'Unmapped'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface CodeBlockProps {
  label: string;
  value: string;
}

export function CodeBlock({ label, value }: CodeBlockProps): ReactElement {
  return (
    <figure className="rounded-dr-sm border border-dr-code-border bg-dr-code-bg">
      <figcaption className="border-b border-dr-code-border px-dr-sm py-dr-xs font-mono text-dr-caption text-dr-subtle">
        {label}
      </figcaption>
      <pre className="overflow-x-auto p-dr-sm font-mono text-dr-code text-dr-text">{value}</pre>
    </figure>
  );
}

interface TextFieldProps {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function TextField({ disabled, id, label, onChange, value }: TextFieldProps): ReactElement {
  return (
    <label className="grid gap-dr-xxs text-dr-caption font-medium text-dr-subtle" htmlFor={id}>
      {label}
      <input
        autoComplete="off"
        className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
        name={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </label>
  );
}

interface SelectFieldProps<TValue extends string> {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: TValue) => void;
  options: readonly TValue[];
  value: TValue;
}

export function SelectField<TValue extends string>({
  disabled,
  id,
  label,
  onChange,
  options,
  value,
}: SelectFieldProps<TValue>): ReactElement {
  return (
    <label className="grid gap-dr-xxs text-dr-caption font-medium text-dr-subtle" htmlFor={id}>
      {label}
      <select
        autoComplete="off"
        className="rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
        name={id}
        onChange={(event) => onChange(event.currentTarget.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

interface TextareaFieldProps {
  disabled: boolean;
  id: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}

export function TextareaField({
  disabled,
  id,
  label,
  onChange,
  value,
}: TextareaFieldProps): ReactElement {
  return (
    <label className="grid gap-dr-xxs text-dr-caption font-medium text-dr-subtle" htmlFor={id}>
      {label}
      <textarea
        autoComplete="off"
        className="min-h-20 resize-y rounded-dr-sm border border-dr-border bg-dr-panel-raised px-dr-sm py-dr-xs font-ui text-dr-small font-normal text-dr-text focus-visible:outline focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        id={id}
        name={id}
        onChange={(event) => onChange(event.currentTarget.value)}
        value={value}
      />
    </label>
  );
}
