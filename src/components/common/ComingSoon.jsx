import { Sparkles } from 'lucide-react';
import EmptyState from '../ui/EmptyState';

/** Shared state for modules whose backend API does not exist yet. */
export default function ComingSoon({ title = 'This module is coming soon.', description, icon = Sparkles, action, className }) {
  return (
    <EmptyState
      className={className}
      icon={icon}
      title={title}
      description={description || "We're building this part of Carevo. It will appear here as soon as it is available."}
      action={action}
    />
  );
}
