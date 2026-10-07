import { forwardRef, useId } from 'react';
import { cn } from '../../utils/helpers';
import { FieldWrapper, fieldBase } from './Input';

const Textarea = forwardRef(function Textarea({ label, error, hint, className, id, rows = 4, ...props }, ref) {
  const autoId = useId();
  const textareaId = id || autoId;
  return (
    <FieldWrapper id={textareaId} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn(fieldBase, 'py-2.5', error ? 'border-danger' : 'border-border', className)}
        {...props}
      />
    </FieldWrapper>
  );
});

export default Textarea;
