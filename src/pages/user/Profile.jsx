import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { skillApi } from '../../api/skill.api';
import DataState from '../../components/common/DataState';
import ProfileHeader from '../../components/profile/ProfileHeader';
import SkillBadge from '../../components/profile/SkillBadge';
import SocialLinks from '../../components/profile/SocialLinks';
import Card, { CardTitle } from '../../components/ui/Card';
import { SkeletonList } from '../../components/ui/Skeleton';
import useApi from '../../hooks/useApi';
import useAuth from '../../hooks/useAuth';
import useProfile from '../../hooks/useProfile';
import { unwrapList } from '../../utils/helpers';
import { normalizeUserSkill } from '../../utils/normalizers';

function TextBlock({ title, text, emptyText, action }) {
  return (
    <Card>
      <CardTitle title={title} action={action} />
      {text ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{text}</p> : <p className="text-sm text-muted">{emptyText}</p>}
    </Card>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const { data: profile, loading, error, reload } = useProfile();
  const skillsRequest = useCallback(() => skillApi.listMine(), []);
  const { data: skillsData } = useApi(skillsRequest);
  const skills = useMemo(() => unwrapList(skillsData).map(normalizeUserSkill), [skillsData]);

  return (
    <DataState loading={loading} error={error} onRetry={reload} skeleton={<SkeletonList count={3} />}>
      <div className="space-y-5">
        <ProfileHeader user={user} profile={profile} />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <TextBlock title="About" text={profile?.bio} emptyText="Add a short bio so recruiters get to know you." />
            <TextBlock title="Experience" text={profile?.experience} emptyText="Share your work experience." />
          </div>
          <div className="space-y-5">
            <Card>
              <CardTitle
                title="Skills"
                action={
                  <Link to="/skills" className="text-sm font-medium text-brand hover:underline">
                    Manage
                  </Link>
                }
              />
              {skills.length ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <SkillBadge key={skill.id} name={skill.name} proficiency={skill.proficiency} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No skills added yet.</p>
              )}
            </Card>
            <Card>
              <CardTitle title="Links" />
              <SocialLinks profile={profile} />
            </Card>
          </div>
        </div>
      </div>
    </DataState>
  );
}
