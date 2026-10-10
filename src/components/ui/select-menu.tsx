'use client';

import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { cn } from '@/lib/utils/cn';

export interface SelectMenuOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

interface SelectMenuProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly SelectMenuOption[];
  /** For a visible `<Label htmlFor>`. Otherwise pass `aria-label`. */
  readonly id?: string;
  readonly 'aria-label'?: string;
  readonly 'aria-labelledby'?: string;
  readonly 'aria-describedby'?: string;
  readonly 'aria-invalid'?: ComponentProps<'button'>['aria-invalid'];
  readonly 'aria-required'?: boolean | 'true' | 'false';
  readonly icon?: LucideIcon;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly onBlur?: (event: FocusEvent<HTMLButtonElement>) => void;
}

const GAP = 4;
const MARGIN = 8;
const MAX_HEIGHT = 288;

type PopoverElement = HTMLUListElement & { showPopover?: () => void; hidePopover?: () => void };

/**
 * The app's single-select dropdown. The list opens in the browser's top layer (popover), so dialogs and scrolling
 * containers never clip it; it sits directly below the field (or above when there is no room) and is at least as wide
 * as the field. Positions are set through the CSSOM, never a `style` attribute, so the strict CSP is respected.
 * Follows the WAI-ARIA select-only combobox pattern.
 */
export function SelectMenu({
  value,
  onValueChange,
  options,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  icon: Icon,
  disabled,
  className,
  onBlur,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const list = useRef<PopoverElement>(null);
  const typed = useRef({ text: '', at: 0 });
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;
  const found = options.findIndex((option) => option.value === value);
  const selectedIndex = Math.max(0, found);
  const selected = found >= 0 ? options[found] : undefined;
  const enabled = (index: number) => !options[index]?.disabled;

  const place = useCallback(() => {
    const button = trigger.current;
    const popup = list.current;
    if (!button || !popup) return;
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - MARGIN;
    const above = rect.top - MARGIN;
    const flip = below < Math.min(MAX_HEIGHT, popup.scrollHeight) && above > below;
    const room = Math.max(120, Math.min(MAX_HEIGHT, flip ? above - GAP : below - GAP));
    popup.style.minWidth = `${rect.width}px`;
    popup.style.maxHeight = `${room}px`;
    const height = Math.min(popup.scrollHeight, room);
    popup.style.top = `${flip ? rect.top - GAP - height : rect.bottom + GAP}px`;
    popup.style.left = `${Math.max(MARGIN, Math.min(rect.left, window.innerWidth - popup.offsetWidth - MARGIN))}px`;
  }, []);

  useLayoutEffect(() => {
    const popup = list.current;
    if (!popup) return;
    if (open) {
      if ('showPopover' in popup && !popup.hasAttribute('popover')) popup.setAttribute('popover', 'manual');
      if (!popup.matches?.(':popover-open')) popup.showPopover?.();
      place();
    } else if (popup.matches?.(':popover-open')) {
      popup.hidePopover?.();
    }
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('resize', place);
      document.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) list.current?.querySelector(`[id="${optionId(active)}"]`)?.scrollIntoView?.({ block: 'nearest' });
    // optionId is derived from a stable useId value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const step = (from: number, direction: 1 | -1) => {
    for (let index = from + direction; index >= 0 && index < options.length; index += direction) {
      if (enabled(index)) return index;
    }
    return from;
  };
  const show = (index = selectedIndex) => {
    setActive(enabled(index) ? index : step(index, 1));
    setOpen(true);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (option && !option.disabled && option.value !== value) onValueChange(option.value);
    setOpen(false);
  };

  const typeAhead = (key: string) => {
    const now = Date.now();
    typed.current = { text: now - typed.current.at > 600 ? key : typed.current.text + key, at: now };
    const query = typed.current.text.toLowerCase();
    const start = open ? active : selectedIndex;
    const order = [...options.keys()].map((offset) => (start + 1 + offset) % options.length);
    const match = order.find((index) => enabled(index) && options[index]!.label.toLowerCase().startsWith(query));
    if (match !== undefined) {
      if (open) setActive(match);
      else choose(match);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) show();
        else setActive((index) => step(index, 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) show();
        else setActive((index) => step(index, -1));
        return;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActive(step(-1, 1));
        }
        return;
      case 'End':
        if (open) {
          event.preventDefault();
          setActive(step(options.length, -1));
        }
        return;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) choose(active);
        else show();
        return;
      case 'Escape':
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        return;
      case 'Tab':
        if (open) choose(active);
        return;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) typeAhead(event.key);
    }
  };

  return (
    <div ref={container} className={cn('relative w-full', className)}>
      <button
        ref={trigger}
        type="button"
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (!container.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
          onBlur?.(event);
        }}
        className={cn(
          'flex h-full min-h-9 w-full items-center gap-2 rounded-md border border-input bg-card py-1 pr-3 text-left text-sm shadow-sm transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive',
          open && 'border-primary ring-2 ring-primary/20',
          Icon ? 'pl-2.5' : 'pl-3',
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
        <span className={cn('min-w-0 flex-1 truncate', !selected?.value && 'text-muted-foreground')}>
          {selected?.label ?? ''}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : (ariaLabelledBy ?? id)}
        tabIndex={-1}
        hidden={!open}
        className="fixed inset-auto z-50 m-0 max-h-72 w-max max-w-[min(32rem,calc(100vw-1rem))] overflow-y-auto rounded-md border bg-card p-1 text-sm text-card-foreground shadow-lg"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          return (
            <li
              key={`${option.value}-${index}`}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              aria-disabled={option.disabled || undefined}
              onPointerMove={() => {
                if (!option.disabled) setActive(index);
              }}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-3 pl-2 select-none',
                index === active && 'bg-accent text-accent-foreground',
                isSelected && 'font-medium text-primary',
                !option.value && 'text-muted-foreground',
                option.disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <Check className={cn('size-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} aria-hidden />
              {option.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/** Reads `<option>` children (including inside fragments and arrays) into menu options. */
function optionsOf(children: ReactNode): SelectMenuOption[] {
  const result: SelectMenuOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const element = child as ReactElement<{ value?: unknown; children?: ReactNode; disabled?: boolean }>;
    if (element.type === 'option') {
      const label = textOf(element.props.children);
      const value = element.props.value === undefined ? label : String(element.props.value);
      result.push({ value, label, disabled: element.props.disabled });
    } else {
      result.push(...optionsOf(element.props.children));
    }
  });
  return result;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

const VALUE =
  typeof window === 'undefined' ? undefined : Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');

/**
 * Drop-in replacement for a native `<select>` with `<option>` children, rendered as `SelectMenu`. A hidden native
 * select keeps the form behaviour: `name`, `ref` (react-hook-form `register`), `onChange`/`onBlur` events with
 * `event.target.value`, `value`/`defaultValue`, `required` and form submission all work as before. Label, error and
 * description props go to the visible control.
 */
export function Select({
  children,
  className,
  id,
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  ref,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
  ...rest
}: Omit<ComponentProps<'select'>, 'multiple'>) {
  const options = optionsOf(children);
  const native = useRef<HTMLSelectElement | null>(null);
  const autoId = useId();
  const triggerId = id ?? autoId;
  const controlled = value !== undefined;
  const [current, setCurrent] = useState(() =>
    String(controlled ? value : (defaultValue ?? options.find((option) => !option.disabled)?.value ?? '')),
  );
  const shown = controlled ? String(value) : current;

  /** Mirrors programmatic writes (`select.value = …`, as react-hook-form `reset` does) into the menu. */
  const attach = useCallback(
    (element: HTMLSelectElement | null) => {
      native.current = element;
      if (element && VALUE?.get && VALUE.set) {
        const { get, set } = VALUE;
        Object.defineProperty(element, 'value', {
          configurable: true,
          get() {
            return get.call(this);
          },
          set(next: string) {
            set.call(this, next);
            setCurrent(get.call(this) as string);
          },
        });
        element.focus = () => document.getElementById(triggerId)?.focus();
        setCurrent(get.call(element) as string);
      }
      assignRef(ref, element);
    },
    [ref, triggerId],
  );

  const select = (next: string) => {
    const element = native.current;
    if (!element) return;
    element.value = next;
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };

  return (
    <>
      <SelectMenu
        id={triggerId}
        value={shown}
        onValueChange={select}
        options={options}
        disabled={disabled}
        className={cn('h-9', className)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={ariaRequired}
        onBlur={() => native.current?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))}
      />
      <select
        {...rest}
        ref={attach}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
        onChange={(event) => {
          setCurrent(event.target.value);
          onChange?.(event);
        }}
        onBlur={onBlur}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      >
        {children}
      </select>
    </>
  );
}
