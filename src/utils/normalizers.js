import { formatSalary, getId } from './helpers';

// Backend payloads can evolve. These adapters keep every component working
// against one stable "view model" and are the only place that knows about
// alternative field names. They never invent data.

const skillName = (skill) => (typeof skill === 'string' ? skill : skill?.name ?? skill?.title ?? '');

export const normalizeSkillNames = (skills) => (Array.isArray(skills) ? skills.map(skillName).filter(Boolean) : []);

export const normalizeJob = (job = {}) => {
  const company = typeof job.company === 'object' && job.company ? job.company : null;
  return {
    id: getId(job),
    title: job.title ?? job.job_title ?? 'Untitled role',
    companyName: company?.name ?? (typeof job.company === 'string' ? job.company : job.company_name) ?? null,
    companyLogo: company?.logo ?? company?.logo_url ?? job.company_logo ?? null,
    location: job.location ?? null,
    jobType: job.job_type ?? job.type ?? null,
    salary: formatSalary({
      min: job.salary_min,
      max: job.salary_max,
      currency: job.currency,
      text: typeof job.salary === 'string' ? job.salary : null,
    }),
    skills: normalizeSkillNames(job.skills ?? job.required_skills),
    description: job.description ?? '',
    responsibilities: toList(job.responsibilities),
    requirements: toList(job.requirements),
    postedAt: job.created_at ?? job.posted_at ?? null,
    isSaved: Boolean(job.is_saved ?? job.saved),
    hasApplied: Boolean(job.has_applied ?? job.applied),
  };
};

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') return value.split('\n').map((line) => line.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);
  return [];
}

export const normalizeResume = (resume = {}) => ({
  id: getId(resume),
  name: resume.name ?? resume.filename ?? resume.file_name ?? 'Resume',
  url: resume.url ?? resume.file_url ?? resume.download_url ?? null,
  isDefault: Boolean(resume.is_default ?? resume.default),
  uploadedAt: resume.created_at ?? resume.uploaded_at ?? null,
  size: resume.size ?? resume.file_size ?? null,
  // Only show a score when the backend actually provides one.
  aiScore: typeof (resume.ai_score ?? resume.score) === 'number' ? resume.ai_score ?? resume.score : null,
});

export const normalizeUserSkill = (entry = {}) => {
  const nested = entry.skill && typeof entry.skill === 'object' ? entry.skill : null;
  return {
    id: entry.skill_id ?? nested?.id ?? nested?._id ?? getId(entry),
    name: nested?.name ?? entry.name ?? entry.skill_name ?? skillName(entry.skill),
    proficiency: (entry.proficiency ?? entry.level ?? '').toString().toLowerCase() || null,
  };
};

export const normalizeCatalogSkill = (skill = {}) => ({
  id: getId(skill),
  name: skillName(skill),
});

export const normalizeApplication = (application = {}) => {
  const job = application.job && typeof application.job === 'object' ? normalizeJob(application.job) : null;
  const resume = application.resume && typeof application.resume === 'object' ? normalizeResume(application.resume) : null;
  return {
    id: getId(application),
    jobId: job?.id ?? application.job_id ?? null,
    jobTitle: job?.title ?? application.job_title ?? 'Job',
    companyName: job?.companyName ?? application.company_name ?? application.company?.name ?? application.company ?? null,
    appliedAt: application.created_at ?? application.applied_at ?? null,
    updatedAt: application.updated_at ?? null,
    status: (application.status ?? 'applied').toString().toLowerCase(),
    resumeName: resume?.name ?? application.resume_name ?? null,
    coverLetter: application.cover_letter ?? null,
    note: application.note ?? application.feedback ?? null,
  };
};

export const normalizeInterview = (interview = {}) => ({
  id: getId(interview),
  companyName: interview.company_name ?? interview.company?.name ?? interview.company ?? null,
  jobTitle: interview.job_title ?? interview.job?.title ?? null,
  scheduledAt: interview.scheduled_at ?? interview.date ?? interview.interview_date ?? null,
  mode: interview.mode ?? interview.type ?? null,
  meetingLink: interview.meeting_link ?? interview.link ?? null,
  status: (interview.status ?? 'scheduled').toString().toLowerCase(),
});

export const normalizeNotification = (notification = {}) => ({
  id: getId(notification),
  type: (notification.type ?? notification.category ?? 'system').toString().toLowerCase(),
  title: notification.title ?? '',
  message: notification.message ?? notification.body ?? '',
  createdAt: notification.created_at ?? null,
  isRead: Boolean(notification.is_read ?? notification.read),
});

export const normalizeVideo = (video = {}) => ({
  id: getId(video),
  url: video.video_url ?? video.url ?? null,
  poster: video.thumbnail_url ?? video.thumbnail ?? null,
  title: video.title ?? '',
  caption: video.description ?? video.caption ?? '',
  creatorName: video.creator?.name ?? video.creator_name ?? video.company_name ?? 'Carevo creator',
  creatorImage: video.creator?.profile_image ?? null,
  likes: Number(video.likes_count ?? video.likes ?? 0),
  comments: Number(video.comments_count ?? video.comments ?? 0),
  isLiked: Boolean(video.is_liked),
  isSaved: Boolean(video.is_saved),
  isFollowing: Boolean(video.is_following),
});

export const normalizeConversation = (conversation = {}) => ({
  userId: conversation.user_id ?? conversation.other_user?.id ?? getId(conversation),
  name: conversation.name ?? conversation.other_user?.name ?? 'Conversation',
  image: conversation.profile_image ?? conversation.other_user?.profile_image ?? null,
  lastMessage: conversation.last_message ?? '',
  updatedAt: conversation.updated_at ?? null,
  unread: Number(conversation.unread_count ?? 0),
});
