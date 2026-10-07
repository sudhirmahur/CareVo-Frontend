import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { APP_TAGLINE } from '../../utils/constants';

export default function About() {
  return (
    <div className="container-page max-w-3xl py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">About Carevo</p>
      <h1 className="mt-3 text-4xl font-extrabold">{APP_TAGLINE}</h1>
      <div className="mt-6 space-y-4 text-lg text-muted">
        <p>
          Carevo is a career platform that connects job seekers, recruiters and the teams that keep hiring fair.
          We believe opportunities should follow skills, not the other way around.
        </p>
        <p>
          Build a profile that reflects what you can actually do, discover roles that match, and let intelligent tools
          help you move forward with confidence.
        </p>
      </div>
      <Button as={Link} to="/register" size="lg" className="mt-8">
        Join Carevo
      </Button>
    </div>
  );
}
