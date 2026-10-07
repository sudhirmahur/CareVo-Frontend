import { Link } from 'react-router-dom';
import { Mail, MapPin, Pencil, Phone } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';

export default function ProfileHeader({ user, profile, editable = true }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="h-24 bg-gradient-to-r from-brand/30 via-brand/10 to-transparent sm:h-32" aria-hidden />
      <div className="px-5 pb-5 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
          <Avatar src={user?.profile_image} name={user?.name} size="xl" className="border-4 border-surface" />
          {editable && (
            <Button as={Link} to="/profile/edit" variant="secondary" leftIcon={Pencil} className="self-start sm:self-auto">
              Edit profile
            </Button>
          )}
        </div>
        <h1 className="mt-4 text-2xl font-bold">{user?.name}</h1>
        {profile?.current_position && <p className="mt-0.5 text-base text-muted">{profile.current_position}</p>}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
          {profile?.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden /> {profile.location}
            </span>
          )}
          {user?.email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4" aria-hidden /> {user.email}
            </span>
          )}
          {user?.phone && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4" aria-hidden /> {user.phone}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
