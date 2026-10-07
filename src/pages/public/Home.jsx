import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bookmark,
  Brain,
  ClipboardCheck,
  FileSearch,
  FileText,
  Handshake,
  PlayCircle,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import HeroSection from './sections/HeroSection';
import Section, { FeatureCard } from './sections/Section';

const STEPS = [
  { icon: UserPlus, title: 'Create your profile', text: 'Add your experience, skills and links so your strengths are clear from the start.' },
  { icon: FileSearch, title: 'Discover opportunities', text: 'Search and filter roles by location, type, skills and salary to find the right fit.' },
  { icon: ClipboardCheck, title: 'Apply and track', text: 'Apply with the resume you choose and follow every application status in one place.' },
];

const SEEKER_FEATURES = [
  { icon: FileText, title: 'Resume management', text: 'Upload multiple resumes and pick a default for faster applications.' },
  { icon: Sparkles, title: 'Skills that count', text: 'List your skills with proficiency levels so recruiters see what you do best.' },
  { icon: Bookmark, title: 'Saved jobs', text: 'Keep promising roles in one list and come back when you are ready.' },
];

const RECRUITER_FEATURES = [
  { icon: Users, title: 'Reach skilled candidates', text: 'Publish roles and connect with people whose skills match what you need.' },
  { icon: ClipboardCheck, title: 'Review applications', text: 'Shortlist, accept or decline candidates from a single workspace.' },
  { icon: Handshake, title: 'Schedule interviews', text: 'Move from application to conversation without leaving Carevo.' },
];

const AI_FEATURES = [
  { icon: ScanSearch, title: 'AI resume analysis', text: 'Get a clear picture of how your resume reads and where it can improve.' },
  { icon: Brain, title: 'Smart job matching', text: 'Recommendations based on your skills, experience and goals.' },
  { icon: Wand2, title: 'Career guidance', text: 'Practical suggestions for the next step in your career.' },
];

const comingSoon = <Badge tone="brand">Coming soon</Badge>;

export default function Home() {
  return (
    <>
      <HeroSection />

      <Section
        id="how-it-works"
        eyebrow="How Carevo works"
        title="From profile to offer in three steps"
        description="A simple, transparent path that keeps you in control of your career."
      >
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <FeatureCard key={step.title} icon={step.icon} title={`${index + 1}. ${step.title}`}>
              {step.text}
            </FeatureCard>
          ))}
        </div>
      </Section>

      <Section id="job-seekers" tinted eyebrow="For job seekers" title="Everything you need to get hired">
        <div className="grid gap-5 md:grid-cols-3">
          {SEEKER_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} icon={feature.icon} title={feature.title}>
              {feature.text}
            </FeatureCard>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button as={Link} to="/register" size="lg">
            Create your free profile
          </Button>
        </div>
      </Section>

      <Section id="recruiters" eyebrow="For recruiters" title="Hire on skills, not guesswork">
        <div className="grid gap-5 md:grid-cols-3">
          {RECRUITER_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} icon={feature.icon} title={feature.title} badge={comingSoon}>
              {feature.text}
            </FeatureCard>
          ))}
        </div>
      </Section>

      <Section id="ai" tinted eyebrow="AI career features" title="Intelligent tools for your next move" description="We are building AI features that work for you, not instead of you.">
        <div className="grid gap-5 md:grid-cols-3">
          {AI_FEATURES.map((feature) => (
            <FeatureCard key={feature.title} icon={feature.icon} title={feature.title} badge={comingSoon}>
              {feature.text}
            </FeatureCard>
          ))}
        </div>
      </Section>

      <Section id="content" eyebrow="Career content" title="Learn from short career videos" description="A vertical video feed with insights from professionals and companies.">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <PlayCircle className="h-7 w-7" aria-hidden />
          </span>
          <p className="mt-4 text-muted">
            Scroll through bite-sized tips, interview advice and company stories. Like, save and follow the creators who help you grow.
          </p>
        </div>
      </Section>

      <Section id="why" tinted eyebrow="Why Carevo" title="Built around you">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={ShieldCheck} title="Your data, your control">
            You choose which resume to share and when. Roles are assigned by the platform, never self-selected.
          </FeatureCard>
          <FeatureCard icon={BarChart3} title="Clear and honest progress">
            See real application statuses and profile completion, with no inflated numbers.
          </FeatureCard>
          <FeatureCard icon={Sparkles} title="One place for your career">
            Profile, resume, skills, jobs and content in a single, consistent experience on web and mobile.
          </FeatureCard>
        </div>
      </Section>
    </>
  );
}
