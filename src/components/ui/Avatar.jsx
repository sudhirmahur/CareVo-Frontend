import { useState } from 'react';
import { cn, getInitials } from '../../utils/helpers';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export default function Avatar({ src, name = '', size = 'md', rounded = 'full', className }) {
  const [failed, setFailed] = useState(false);
  const shape = rounded === 'full' ? 'rounded-full' : 'rounded-xl';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden bg-brand/15 font-semibold text-brand',
        shape,
        SIZES[size],
        className,
      )}
    >
      {src && !failed ? (
        <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{getInitials(name)}</span>
      )}
    </span>
  );
}
