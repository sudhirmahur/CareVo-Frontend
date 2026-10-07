import ComingSoon from './ComingSoon';
import PageHeader from './PageHeader';

/** Standard page for Recruiter/Admin modules whose backend is not available yet. */
export default function ModulePlaceholder({ title, description, icon, planned = [] }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <ComingSoon
        icon={icon}
        title="This module is coming soon."
        description="We are building this part of Carevo. It will be connected to the backend as soon as the API is ready."
        action={
          planned.length > 0 && (
            <ul className="mx-auto max-w-sm space-y-1.5 text-left text-sm text-muted">
              {planned.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          )
        }
      />
    </>
  );
}
