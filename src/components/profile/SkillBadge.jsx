import { X } from 'lucide-react';
import { cn, toTitleCase } from '../../utils/helpers';

const LEVEL_STYLES = {
  beginner: 'border-info/30 bg-info/10 text-info',
  intermediate: 'border-warning/30 bg-warning/10 text-warning',
  advanced: 'border-success/30 bg-success/10 text-success',
};

/** A skill chip. Shows proficiency when known and a remove button when `onRemove` is passed. */
export default function SkillBadge({ name, proficiency, onRemove, removing = false, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
        LEVEL_STYLES[proficiency] ?? 'border-border bg-surface-2 text-fg',
        className,
      )}
    >
      {name}
      {proficiency && <span className="opacity-75">· {toTitleCase(proficiency)}</span>}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove ${name}`}
          className="-mr-1 rounded-full p-0.5 transition-colors hover:bg-black/20 disabled:opacity-50"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
