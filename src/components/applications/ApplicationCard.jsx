import { Link } from 'react-router-dom';
import { Building2, CalendarDays, FileText } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import Card from '../ui/Card';
import StatusBadge from './StatusBadge';

/** `application` is a normalized application (see utils/normalizers.js). */
export default function ApplicationCard({ application }) {
  return (
    <Card interactive as={Link} to={`/applications/${application.id}`} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{application.jobTitle}</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4" aria-hidden /> {application.companyName || 'Company'}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden /> Applied {formatDate(application.appliedAt)}
          </li>
          {application.resumeName && (
            <li className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4" aria-hidden /> {application.resumeName}
            </li>
          )}
        </ul>
      </div>
      <StatusBadge status={application.status} />
    </Card>
  );
}
