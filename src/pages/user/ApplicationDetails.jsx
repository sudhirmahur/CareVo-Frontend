import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { applicationApi } from '../../api/application.api';
import StatusBadge from '../../components/applications/StatusBadge';
import DataState from '../../components/common/DataState';
import Button from '../../components/ui/Button';
import Card, { CardTitle } from '../../components/ui/Card';
import { SkeletonList } from '../../components/ui/Skeleton';
import useApi from '../../hooks/useApi';
import { formatDate } from '../../utils/helpers';
import { normalizeApplication } from '../../utils/normalizers';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm">{children || '—'}</dd>
    </div>
  );
}

export default function ApplicationDetails() {
  const { id } = useParams();
  const request = useCallback(() => applicationApi.get(id), [id]);
  const { data, loading, error, reload } = useApi(request);
  const application = useMemo(() => (data ? normalizeApplication(data) : null), [data]);

  return (
    <>
      <Link to="/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to applications
      </Link>

      <DataState loading={loading} error={error} onRetry={reload} skeleton={<SkeletonList count={1} lines={5} />}>
        {application && (
          <div className="space-y-5">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{application.jobTitle}</h1>
                  <p className="text-muted">{application.companyName || 'Company'}</p>
                </div>
                {/* Read-only: only the recruiter/backend can change a status. */}
                <StatusBadge status={application.status} />
              </div>
              <dl className="mt-6 grid gap-5 sm:grid-cols-3">
                <Detail label="Applied on">{formatDate(application.appliedAt)}</Detail>
                <Detail label="Last updated">{application.updatedAt ? formatDate(application.updatedAt) : null}</Detail>
                <Detail label="Resume">{application.resumeName}</Detail>
              </dl>
              {application.jobId && (
                <Button as={Link} to={`/jobs/${application.jobId}`} variant="secondary" size="sm" className="mt-6">
                  View job
                </Button>
              )}
            </Card>

            {application.coverLetter && (
              <Card>
                <CardTitle title="Cover letter" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{application.coverLetter}</p>
              </Card>
            )}
            {application.note && (
              <Card>
                <CardTitle title="Feedback" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{application.note}</p>
              </Card>
            )}
          </div>
        )}
      </DataState>
    </>
  );
}
