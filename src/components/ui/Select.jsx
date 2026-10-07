import { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/helpers';
import { FieldWrapper, fieldBase } from './Input';

const Select = forwardRef(function Select(
  { label, error, hint, options = [], placeholder, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <FieldWrapper id={selectId} label={label} error={error} hint={hint}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={cn(fieldBase, 'h-11 appearance-none pr-10', error ? 'border-danger' : 'border-border', className)}
          {...props}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    </FieldWrapper>
  );
});

export default Select;
