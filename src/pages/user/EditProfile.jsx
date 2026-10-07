import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi } from '../../api/profile.api';
import { userApi } from '../../api/user.api';
import DataState from '../../components/common/DataState';
import PageHeader from '../../components/common/PageHeader';
import ProfileForm from '../../components/profile/ProfileForm';
import Card from '../../components/ui/Card';
import { SkeletonList } from '../../components/ui/Skeleton';
import useAuth from '../../hooks/useAuth';
import useProfile from '../../hooks/useProfile';
import useToast from '../../hooks/useToast';

const emptyToNull = (obj) => Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, value === '' ? null : value]));

export default function EditProfile() {
  const { user, refreshUser } = useAuth();
  const { data: profile, loading, error, reload } = useProfile();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (values) => {
    setSubmitting(true);
    setServerError(null);
    setFieldErrors({});
    // Email and role are intentionally never sent from this form.
    const { name, phone, profile_image: profileImage, email, ...profileFields } = values;
    try {
      await userApi.updateMe(emptyToNull({ name, phone, profile_image: profileImage }));
      await profileApi.update(emptyToNull(profileFields));
      await refreshUser();
      toast.success('Profile updated');
      navigate('/profile');
    } catch (err) {
      setFieldErrors(err.fieldErrors ?? {});
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Edit profile" description="Keep your details current so recruiters can find you." />
      <DataState loading={loading} error={error} onRetry={reload} skeleton={<SkeletonList count={2} lines={4} />}>
        <Card>
          {serverError && (
            <p role="alert" className="mb-5 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
              {serverError}
            </p>
          )}
          <ProfileForm
            user={user}
            profile={profile}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/profile')}
            submitting={submitting}
            serverFieldErrors={fieldErrors}
          />
        </Card>
      </DataState>
    </>
  );
}
