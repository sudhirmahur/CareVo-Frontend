import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Clock, Flag, MapPin, Wallet } from 'lucide-react';
import { jobApi } from '../../api/job.api';
import DataState from '../../components/common/DataState';
import ReportModal from '../../components/common/ReportModal';
import ApplyModal from '../../components/jobs/ApplyModal';
import SkillBadge from '../../components/profile/SkillBadge';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card, { CardTitle } from '../../components/ui/Card';
import { SkeletonList } from '../../components/ui/Skeleton';
import useApi from '../../hooks/useApi';
import useSavedJobs from '../../hooks/useSavedJobs';
import { cn, formatDate, toTitleCase } from '../../utils/helpers';
import { normalizeJob } from '../../utils/normalizers';

function BulletSection({ title, items }) {
  if (!items.length) return null;
  return (
    <Card>
      <CardTitle title={title} />
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-brand">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

export default function JobDetails() {
  const { id } = useParams();
  const request = useCallback(() => jobApi.get(id), [id]);
  const { data, loading, error, reload } = useApi(request);
  const job = useMemo(() => (data ? normalizeJob(data) : null), [data]);

  const { savedIds, toggle: toggleSave } = useSavedJobs();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [reporting, setReporting] = useState(false);

  const isSaved = job ? savedIds.has(job.id) || job.isSaved : false;
  const hasApplied = applied || Boolean(job?.hasApplied);

  return (
    <>
      <Link to="/jobs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to jobs
      </Link>

      <DataState loading={loading} error={error} onRetry={reload} skeleton={<SkeletonList count={2} lines={4} />}>
        {job && (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <div className="flex items-start gap-4">
                  <Avatar src={job.companyLogo} name={job.companyName || job.title} rounded="xl" size="lg" />
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold sm:text-2xl">{job.title}</h1>
                    <p className="text-muted">{job.companyName || 'Company not specified'}</p>
                  </div>
                </div>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
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
                      <Clock className="h-4 w-4" aria-hidden /> Posted {formatDate(job.postedAt)}
                    </li>
                  )}
                </ul>
                {job.jobType && (
                  <div className="mt-4">
                    <Badge tone="brand">{toTitleCase(job.jobType)}</Badge>
                  </div>
                )}
              </Card>

              {job.description && (
                <Card>
                  <CardTitle title="Description" />
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{job.description}</p>
                </Card>
              )}
              <BulletSection title="Responsibilities" items={job.responsibilities} />
              <BulletSection title="Requirements" items={job.requirements} />
              {job.skills.length > 0 && (
                <Card>
                  <CardTitle title="Skills" />
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill) => (
                      <SkillBadge key={skill} name={skill} />
                    ))}
                  </div>
                </Card>
              )}
            </div>

            <aside className="lg:col-span-1">
              <Card className="space-y-3 lg:sticky lg:top-24">
                <Button size="lg" className="w-full" disabled={hasApplied} onClick={() => setApplying(true)}>
                  {hasApplied ? 'Application sent' : 'Apply now'}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  leftIcon={Bookmark}
                  onClick={() => toggleSave(job)}
                  aria-pressed={isSaved}
                >
                  <span className={cn(isSaved && 'text-brand')}>{isSaved ? 'Saved' : 'Save job'}</span>
                </Button>
                <Button variant="ghost" className="w-full" leftIcon={Flag} onClick={() => setReporting(true)}>
                  Report this job
                </Button>
              </Card>
            </aside>
          </div>
        )}
      </DataState>

      {applying && job && <ApplyModal job={job} onClose={() => setApplying(false)} onApplied={() => setApplied(true)} />}
      <ReportModal open={reporting} onClose={() => setReporting(false)} contentType="job" contentId={id} />
    </>
  );
}
