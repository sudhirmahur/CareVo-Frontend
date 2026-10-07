import { Building2, CalendarDays, Clock, Video } from 'lucide-react';
import { formatDate, formatTime, toTitleCase } from '../../utils/helpers';
import Button from '../ui/Button';
import Card from '../ui/Card';
import StatusBadge from './StatusBadge';

/** `interview` is a normalized interview (see utils/normalizers.js). */
export default function InterviewCard({ interview }) {
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-base font-semibold">{interview.jobTitle || 'Interview'}</p>
          <StatusBadge status={interview.status} kind="interview" />
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <li className="inline-flex items-center gap-1.5">
            <Building2 className="h-4 w-4" aria-hidden /> {interview.companyName || 'Company'}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" aria-hidden /> {formatDate(interview.scheduledAt)}
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden /> {formatTime(interview.scheduledAt)}
          </li>
          {interview.mode && (
            <li className="inline-flex items-center gap-1.5">
              <Video className="h-4 w-4" aria-hidden /> {toTitleCase(interview.mode)}
            </li>
          )}
        </ul>
      </div>
      {interview.meetingLink && (
        <Button as="a" href={interview.meetingLink} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
          Join meeting
        </Button>
      )}
    </Card>
  );
}
