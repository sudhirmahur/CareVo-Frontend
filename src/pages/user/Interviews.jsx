import { useCallback, useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { interviewApi } from '../../api/interview.api';
import InterviewCard from '../../components/applications/InterviewCard';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import useApi from '../../hooks/useApi';
import { unwrapList } from '../../utils/helpers';
import { normalizeInterview } from '../../utils/normalizers';

export default function Interviews() {
  const request = useCallback(() => interviewApi.list(), []);
  const { data, loading, error, notAvailable, reload } = useApi(request);
  const interviews = useMemo(
    () => unwrapList(data).map(normalizeInterview).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)),
    [data],
  );

  return (
    <>
      <PageHeader title="Interviews" description="Your scheduled and past interviews." />
      <DataState
        loading={loading}
        error={error}
        notAvailable={notAvailable}
        onRetry={reload}
        comingSoon={{ icon: CalendarDays, title: 'Interviews are coming soon.', description: 'Scheduled interviews and meeting links will appear here.' }}
        isEmpty={interviews.length === 0}
        empty={{ icon: CalendarDays, title: 'No interviews scheduled', description: 'When a recruiter invites you, the details will show up here.' }}
      >
        <div className="grid gap-3">
          {interviews.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
        </div>
      </DataState>
    </>
  );
}
