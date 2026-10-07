import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import ApplyModal from '../../components/jobs/ApplyModal';
import JobCard from '../../components/jobs/JobCard';
import Button from '../../components/ui/Button';
import { SkeletonList } from '../../components/ui/Skeleton';
import useSavedJobs from '../../hooks/useSavedJobs';

export default function SavedJobs() {
  const { savedJobs, loading, error, notAvailable, reload, toggle } = useSavedJobs();
  const [applyingJob, setApplyingJob] = useState(null);

  return (
    <>
      <PageHeader title="Saved jobs" description="Roles you bookmarked to come back to." />
      <DataState
        loading={loading}
        error={error}
        notAvailable={notAvailable}
        onRetry={reload}
        skeleton={<SkeletonList count={2} className="md:grid-cols-2" />}
        comingSoon={{ icon: Bookmark, title: 'Saved jobs are coming soon.' }}
        isEmpty={savedJobs.length === 0}
        empty={{
          icon: Bookmark,
          title: 'No saved jobs yet',
          description: 'Tap the bookmark on any job to save it here.',
          action: (
            <Button as={Link} to="/jobs">
              Browse jobs
            </Button>
          ),
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {savedJobs.map((job) => (
            <JobCard key={job.id} job={job} saved onToggleSave={toggle} applied={job.hasApplied} onApply={setApplyingJob} />
          ))}
        </div>
      </DataState>
      {applyingJob && <ApplyModal job={applyingJob} onClose={() => setApplyingJob(null)} />}
    </>
  );
}
