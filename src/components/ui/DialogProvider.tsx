'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import { Field, Input, Textarea } from './Field';

/**
 * Promise-based replacements for `window.confirm` and `window.prompt`.
 *
 * The native dialogs were used for destructive actions and for collecting a
 * cancellation reason. They are unstyled, unbranded, impossible to make
 * readable on a phone, and on mobile browsers they block the whole page with a
 * system sheet that looks like a security warning. Worse, `prompt()` is
 * disabled outright in some mobile browsers — so "give a reason" silently
 * returned null and the action went through with no reason at all.
 *
 * Usage:
 *   const { confirm, promptText } = useDialog();
 *   if (!(await confirm({ title: '...', tone: 'danger' }))) return;
 *   const reason = await promptText({ title: '...', required: true });
 *   if (reason === null) return;   // cancelled
 */

type Tone = 'danger' | 'warning' | 'info';

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
}

interface PromptOptions extends ConfirmOptions {
  label?: string;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  /** Prefilled value. */
  defaultValue?: string;
  /** A reason wants room to type; an amount wants a numeric keypad. */
  input?: 'textarea' | 'number';
}

interface DialogApi {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves with the text, or null when cancelled. */
  promptText: (options: PromptOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside <DialogProvider>');
  return ctx;
}

const TONES: Record<Tone, { icon: typeof AlertTriangle; chip: string; button: 'primary' | 'danger' }> = {
  danger: { icon: Trash2, chip: 'bg-red-100 text-red-600', button: 'danger' },
  warning: { icon: AlertTriangle, chip: 'bg-amber-100 text-amber-700', button: 'primary' },
  info: { icon: Info, chip: 'bg-brand-100 text-brand-700', button: 'primary' },
};

type State = (PromptOptions & { kind: 'confirm' | 'prompt' }) | null;

export default function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  // Held in a ref so opening a dialog does not re-create the api object and
  // re-render every consumer.
  const resolver = useRef<((result: string | boolean | null) => void) | null>(null);

  const close = useCallback((result: string | boolean | null) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
    setValue('');
    setTouched(false);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          resolver.current = (result) => resolve(result === true);
          setState({ ...options, kind: 'confirm' });
        }),
      promptText: (options) =>
        new Promise<string | null>((resolve) => {
          resolver.current = (result) => resolve(typeof result === 'string' ? result : null);
          setValue(options.defaultValue ?? '');
          setState({ ...options, kind: 'prompt' });
        }),
    }),
    []
  );

  const tone = TONES[state?.tone ?? 'info'];
  const ToneIcon = tone.icon;
  const missing = Boolean(state?.kind === 'prompt' && state.required && !value.trim());

  const submit = () => {
    if (!state) return;
    if (state.kind === 'confirm') return close(true);
    if (missing) {
      setTouched(true);
      return;
    }
    close(value.trim());
  };

  return (
    <DialogContext.Provider value={api}>
      {children}

      {state && (
        <Modal
          title={state.title}
          onClose={() => close(null)}
          icon={
            <span className={`grid size-9 place-items-center rounded-xl ${tone.chip}`}>
              <ToneIcon size={18} />
            </span>
          }
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" fullWidth onClick={() => close(null)}>
                {state.cancelLabel ?? 'বাতিল'}
              </Button>
              <Button variant={tone.button} size="lg" fullWidth onClick={submit}>
                {state.confirmLabel ?? 'নিশ্চিত করুন'}
              </Button>
            </div>
          }
        >
          {state.message && <div className="text-sm leading-relaxed text-ink-700">{state.message}</div>}

          {state.kind === 'prompt' && (
            <Field
              label={state.label ?? 'কারণ'}
              htmlFor="dialog-reason"
              required={state.required}
              hint={touched && missing ? undefined : state.hint}
              className={state.message ? 'mt-4' : ''}
            >
              {state.input === 'number' ? (
                <Input
                  id="dialog-reason"
                  type="number"
                  inputMode="numeric"
                  value={value}
                  autoFocus
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={state.placeholder}
                  aria-invalid={touched && missing}
                />
              ) : (
                <Textarea
                  id="dialog-reason"
                  rows={3}
                  value={value}
                  autoFocus
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={state.placeholder}
                  aria-invalid={touched && missing}
                />
              )}
              {touched && missing && (
                <p className="mt-1.5 text-xs font-medium text-red-600">এই ঘরটি পূরণ করতে হবে।</p>
              )}
            </Field>
          )}
        </Modal>
      )}
    </DialogContext.Provider>
  );
}
