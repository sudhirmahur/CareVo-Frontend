import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Briefcase, CalendarDays, ClipboardList, FileText, PlayCircle, Sparkles } from 'lucide-react';
import { applicationApi } from '../../api/application.api';
import { interviewApi } from '../../api/interview.api';
import { jobApi } from '../../api/job.api';
import { resumeApi } from '../../api/resume.api';
import { skillApi } from '../../api/skill.api';
import { videoApi } from '../../api/video.api';
import ApplicationCard from '../../components/applications/ApplicationCard';
import InterviewCard from '../../components/applications/InterviewCard';
import DashboardSection from '../../components/common/DashboardSection';
import PageHeader from '../../components/common/PageHeader';
import JobCard from '../../components/jobs/JobCard';
import ProfileCard from '../../components/profile/ProfileCard';
import SkillBadge from '../../components/profile/SkillBadge';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import useApi from '../../hooks/useApi';
import useAuth from '../../hooks/useAuth';
import useProfile from '../../hooks/useProfile';
import useSavedJobs from '../../hooks/useSavedJobs';
import { calcProfileCompletion, formatDate, unwrapList } from '../../utils/helpers';
import {
  normalizeApplication,
  normalizeInterview,
  normalizeJob,
  normalizeResume,
  normalizeUserSkill,
  normalizeVideo,
} from '../../utils/normalizers';

const useList = (fetcher, normalize, limit) => {
  const request = useCallback(() => fetcher(), [fetcher]);
  const state = useApi(request);
  const items = useMemo(() => {
    const list = unwrapList(state.data).map(normalize);
    return limit ? list.slice(0, limit) : list;
  }, [state.data, normalize, limit]);
  return { state, items };
};

// Stable fetchers (module scope) so useApi does not refetch on every render.
const fetchLatestJobs = () => jobApi.list({ limit: 3 });
const fetchApplications = () => applicationApi.list();
const fetchInterviews = () => interviewApi.list();
const fetchVideos = () => videoApi.feed({ limit: 3 });
const fetchSkills = () => skillApi.listMine();
const fetchResumes = () => resumeApi.list();

export default function Dashboard() {
  const { user } = useAuth();
  const profile = useProfile();
  const skills = useList(fetchSkills, normalizeUserSkill);
  const resumes = useList(fetchResumes, normalizeResume);
  const jobs = useList(fetchLatestJobs, normalizeJob, 3);
  const applications = useList(fetchApplications, normalizeApplication, 3);
  const interviews = useList(fetchInterviews, normalizeInterview, 3);
  const videos = useList(fetchVideos, normalizeVideo, 3);
  const saved = useSavedJobs();

  const defaultResume = resumes.items.find((resume) => resume.isDefault) ?? resumes.items[0];
  const completion = profile.loading
    ? undefined
    : calcProfileCompletion({
        user,
        profile: profile.data,
        skillsCount: skills.items.length,
        resumesCount: resumes.items.length,
      });
  const firstName = user?.name?.split(' ')[0];

  return (
    <>
      <PageHeader title={`Welcome back${firstName ? `, ${firstName}` : ''}`} description="Here is where your job search stands today." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <ProfileCard user={user} profile={profile.data} completion={completion} />

          <DashboardSection
            title="Resume"
            to="/resume"
            linkLabel="Manage"
            state={resumes.state}
            isEmpty={resumes.items.length === 0}
            empty={{ icon: FileText, title: 'No resume uploaded', description: 'Upload one to start applying.', action: <Button as={Link} to="/resume" size="sm">Upload resume</Button> }}
          >
            {defaultResume && (
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{defaultResume.name}</p>
                  <p className="text-xs text-muted">Uploaded {formatDate(defaultResume.uploadedAt)}</p>
                </div>
                {defaultResume.isDefault && <Badge tone="success">Default</Badge>}
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Skills"
            to="/skills"
            linkLabel="Manage"
            state={skills.state}
            isEmpty={skills.items.length === 0}
            empty={{ icon: Sparkles, title: 'No skills yet', description: 'Add skills to improve your matches.', action: <Button as={Link} to="/skills" size="sm">Add skills</Button> }}
          >
            <div className="flex flex-wrap gap-2">
              {skills.items.map((skill) => (
                <SkillBadge key={skill.id} name={skill.name} proficiency={skill.proficiency} />
              ))}
            </div>
          </DashboardSection>
        </div>

        <div className="space-y-5 lg:col-span-2">
          {/* TODO: switch to a recommendations endpoint when the backend provides one. */}
          <DashboardSection
            title="Jobs to explore"
            to="/jobs"
            state={jobs.state}
            isEmpty={jobs.items.length === 0}
            empty={{ icon: Briefcase, title: 'No jobs available right now', description: 'Check back soon for new openings.' }}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {jobs.items.map((job) => (
                <JobCard key={job.id} job={job} saved={saved.savedIds.has(job.id)} applied={job.hasApplied} onToggleSave={saved.toggle} />
              ))}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Recent applications"
            to="/applications"
            state={applications.state}
            isEmpty={applications.items.length === 0}
            empty={{ icon: ClipboardList, title: 'No applications yet', description: 'Your applications will be tracked here.' }}
          >
            <div className="grid gap-3">
              {applications.items.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          </DashboardSection>

          <div className="grid gap-5 md:grid-cols-2">
            <DashboardSection
              title="Upcoming interviews"
              to="/interviews"
              state={interviews.state}
              isEmpty={interviews.items.length === 0}
              empty={{ icon: CalendarDays, title: 'No interviews scheduled' }}
              comingSoon={{ icon: CalendarDays, title: 'Interviews are coming soon.' }}
            >
              <div className="grid gap-3">
                {interviews.items.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
              </div>
            </DashboardSection>

            <DashboardSection
              title="Saved jobs"
              to="/saved-jobs"
              state={saved}
              isEmpty={saved.savedJobs.length === 0}
              empty={{ icon: Bookmark, title: 'No saved jobs yet' }}
              comingSoon={{ icon: Bookmark, title: 'Saved jobs are coming soon.' }}
            >
              <ul className="space-y-2">
                {saved.savedJobs.slice(0, 4).map((job) => (
                  <li key={job.id}>
                    <Link to={`/jobs/${job.id}`} className="block rounded-xl border border-border px-3.5 py-2.5 transition-colors hover:border-brand/40">
                      <p className="truncate text-sm font-medium">{job.title}</p>
                      <p className="truncate text-xs text-muted">{job.companyName}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </DashboardSection>
          </div>

          <DashboardSection
            title="Career content"
            to="/videos"
            linkLabel="Watch"
            state={videos.state}
            isEmpty={videos.items.length === 0}
            empty={{ icon: PlayCircle, title: 'No videos yet' }}
            comingSoon={{ icon: PlayCircle, title: 'Career videos are coming soon.' }}
          >
            <ul className="grid gap-3 sm:grid-cols-3">
              {videos.items.map((video) => (
                <li key={video.id}>
                  <Link to="/videos" className="block rounded-xl border border-border p-3 transition-colors hover:border-brand/40">
                    <p className="line-clamp-2 text-sm font-medium">{video.title || video.caption}</p>
                    <p className="mt-1 truncate text-xs text-muted">{video.creatorName}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </DashboardSection>
        </div>
      </div>
    </>
  );
}
