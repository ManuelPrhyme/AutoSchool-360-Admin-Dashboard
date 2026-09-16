import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Clipboard helper with a textarea fallback (older browsers / non-secure
 * contexts where navigator.clipboard is unavailable) and "copied" feedback.
 */
export function useCopyToClipboard(resetMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), resetMs);
      return true;
    } catch {
      return false;
    }
  }, [resetMs]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { copied, copy };
}

interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  title?: string;
}

/** Copies `text` to the clipboard and flashes "Copied ✓" feedback. */
export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied ✓',
  className = 'rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-70',
  title,
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();
  return (
    <button
      onClick={() => copy(text)}
      className={className}
      title={title ?? `Copy ${text}`}
      aria-live="polite"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}

interface ShareButtonProps {
  text: string;
  title?: string;
  shareMessage?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Opens the native share sheet when available (mobile / supported browsers);
 * otherwise copies the message and tells the user to paste it wherever needed.
 */
export function ShareButton({
  text,
  title = 'Activation code',
  shareMessage,
  className = 'rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-70',
  style,
}: ShareButtonProps) {
  const { copied, copy } = useCopyToClipboard();
  const message = shareMessage ?? `Your AutoSchool360 activation code: ${text}`;

  async function onShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: message });
        return;
      } catch (e) {
        // User dismissed the sheet — nothing to do; AbortError is expected.
        if ((e as Error)?.name === 'AbortError') return;
      }
    }
    // No Web Share API (or it failed): copy and let the user paste it.
    await copy(message);
  }

  return (
    <button onClick={onShare} className={className} style={style} title="Share this code">
      {copied ? 'Copied — paste to share ✓' : 'Share'}
    </button>
  );
}
