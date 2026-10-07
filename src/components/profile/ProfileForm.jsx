import { useForm } from 'react-hook-form';
import { rules } from '../../utils/validators';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

const toFormValues = (user, profile) => ({
  name: user?.name ?? '',
  email: user?.email ?? '',
  phone: user?.phone ?? '',
  profile_image: user?.profile_image ?? '',

  bio: profile?.bio ?? '',
  experience_years: profile?.experience_years ?? '',
  current_position: profile?.current_position ?? '',
  location: profile?.location ?? '',

  github_url: profile?.github_url ?? '',
  linkedin_url: profile?.linkedin_url ?? '',
  portfolio_url: profile?.portfolio_url ?? '',
});

export default function ProfileForm({
  user,
  profile,
  onSubmit,
  onCancel,
  submitting,
  serverFieldErrors = {}
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    defaultValues: toFormValues(user, profile)
  });

  const fieldError = (name) =>
    errors[name]?.message || serverFieldErrors[name];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-8"
    >

      {/* BASIC INFORMATION */}

      <section className="space-y-4">
        <h2 className="text-base font-semibold">
          Basic information
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">

          <Input
            label="Full name"
            autoComplete="name"
            error={fieldError('name')}
            {...register('name', rules.name)}
          />

          <Input
            label="Email"
            type="email"
            disabled
            hint="Email cannot be changed here."
            {...register('email')}
          />

          <Input
            label="Phone"
            type="tel"
            autoComplete="tel"
            error={fieldError('phone')}
            {...register('phone')}
          />

          <Input
            label="Profile image URL"
            placeholder="https://"
            error={fieldError('profile_image')}
            {...register(
              'profile_image',
              rules.optionalUrl
            )}
          />

        </div>
      </section>


      {/* PROFESSIONAL DETAILS */}

      <section className="space-y-4">

        <h2 className="text-base font-semibold">
          Professional details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">

          <Input
            label="Current position"
            error={fieldError('current_position')}
            {...register('current_position')}
          />

          <Input
            label="Location"
            autoComplete="address-level2"
            error={fieldError('location')}
            {...register('location')}
          />

          <Input
            label="Experience (Years)"
            type="number"
            min="0"
            step="1"
            error={fieldError('experience_years')}
            {...register('experience_years', {
              valueAsNumber: true
            })}
          />

        </div>

        <Textarea
          label="Bio"
          rows={4}
          placeholder="A short summary of who you are and what you do."
          error={fieldError('bio')}
          {...register('bio')}
        />

      </section>


      {/* LINKS */}

      <section className="space-y-4">

        <h2 className="text-base font-semibold">
          Links
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">

          <Input
            label="GitHub"
            placeholder="https://github.com/username"
            error={fieldError('github_url')}
            {...register(
              'github_url',
              rules.optionalUrl
            )}
          />

          <Input
            label="LinkedIn"
            placeholder="https://linkedin.com/in/username"
            error={fieldError('linkedin_url')}
            {...register(
              'linkedin_url',
              rules.optionalUrl
            )}
          />

          <Input
            label="Portfolio"
            placeholder="https://yoursite.com"
            error={fieldError('portfolio_url')}
            {...register(
              'portfolio_url',
              rules.optionalUrl
            )}
          />

        </div>

      </section>


      {/* ACTIONS */}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button
          type="submit"
          loading={submitting}
          disabled={!isDirty}
        >
          Save changes
        </Button>

      </div>

    </form>
  );
}