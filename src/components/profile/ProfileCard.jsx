import { Link } from 'react-router-dom';
import Avatar from '../ui/Avatar';
import Card from '../ui/Card';

/** Compact identity card used on the dashboard. */
export default function ProfileCard({ user, profile, completion }) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar src={user?.profile_image} name={user?.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{user?.name}</p>
          <p className="truncate text-sm text-muted">{profile?.current_position || user?.email}</p>
        </div>
      </div>
      {typeof completion === 'number' && (
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-muted">Profile completion</span>
            <span className="font-semibold">{completion}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={completion}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Profile completion"
          >
            <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>
          {completion < 100 && (
            <Link to="/profile/edit" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              Complete your profile
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
