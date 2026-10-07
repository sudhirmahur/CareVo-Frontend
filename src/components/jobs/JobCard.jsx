import { Link } from 'react-router-dom';
import { Bookmark, Clock, MapPin, Wallet } from 'lucide-react';
import { cn, timeAgo, toTitleCase } from '../../utils/helpers';
import SkillBadge from '../profile/SkillBadge';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';

const MAX_SKILLS = 4;

/** `job` is a normalized job (see utils/normalizers.js). */
export default function JobCard({ job, saved = false, applied = false, onToggleSave, onApply }) {
  const extraSkills = job.skills.length - MAX_SKILLS;
  return (
    <Card interactive className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar src={job.companyLogo} name={job.companyName || job.title} rounded="xl" size="lg" />
        <div className="min-w-0 flex-1">
          <Link to={`/jobs/${job.id}`} className="block truncate text-base font-semibold hover:text-brand">
            {job.title}
          </Link>
          <p className="truncate text-sm text-muted">{job.companyName || 'Company not specified'}</p>
        </div>
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(job)}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved jobs' : 'Save job'}
            className={cn(
              'rounded-xl p-2 transition-colors hover:bg-surface-2',
              saved ? 'text-brand' : 'text-muted hover:text-fg',
            )}
          >
            <Bookmark className={cn('h-5 w-5', saved && 'fill-current')} />
          </button>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
        {job.location && (
          <li className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" aria-hidden /> {job.location}
          </li>
        )}
        {job.salary && (
          <li className="inline-flex items-center gap-1.5">
            <Wallet className="h-4 w-4" aria-hidden /> {job.salary}
          </li>
        )}
        {job.postedAt && (
          <li className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden /> {timeAgo(job.postedAt)}
          </li>
        )}
      </ul>

      <div className="flex flex-wrap gap-1.5">
        {job.jobType && <Badge tone="brand">{toTitleCase(job.jobType)}</Badge>}
        {job.skills.slice(0, MAX_SKILLS).map((skill) => (
          <SkillBadge key={skill} name={skill} />
        ))}
        {extraSkills > 0 && <Badge>+{extraSkills}</Badge>}
      </div>

      <div className="mt-auto flex gap-2 pt-1">
        <Button as={Link} to={`/jobs/${job.id}`} variant="secondary" className="flex-1">
          View details
        </Button>
        <Button className="flex-1" disabled={applied} onClick={() => onApply?.(job)}>
          {applied ? 'Applied' : 'Apply'}
        </Button>
      </div>
    </Card>
  );
}
