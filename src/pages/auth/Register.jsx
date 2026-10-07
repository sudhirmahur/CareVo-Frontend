import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User } from 'lucide-react';
import AuthShell from '../../components/auth/AuthShell';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import useAuth from '../../hooks/useAuth';
import { matchesField, rules } from '../../utils/validators';

// There is deliberately no role field: the backend always assigns "user".
export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState(null);

  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { name: '', email: '', password: '', confirmPassword: '' } });

  const onSubmit = async ({ name, email, password }) => {
    setFormError(null);
    try {
      await registerUser({ name: name.trim(), email: email.trim(), password });
      navigate('/login', { replace: true, state: { registered: true, email: email.trim() } });
    } catch (error) {
      // Map FastAPI 422 field errors onto the matching inputs when possible.
      const mapped = Object.entries(error.fieldErrors ?? {}).filter(([field]) => ['name', 'email', 'password'].includes(field));
      mapped.forEach(([field, message]) => setError(field, { message }));
      if (!mapped.length) setFormError(error.message);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Your skills deserve the right opportunities."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input label="Full name" autoComplete="name" leftIcon={User} placeholder="Your name" error={errors.name?.message} {...register('name', rules.name)} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={Mail}
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email', rules.email)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          leftIcon={Lock}
          placeholder="At least 6 characters"
          error={errors.password?.message}
          {...register('password', rules.password)}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          leftIcon={Lock}
          placeholder="Repeat your password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', matchesField(getValues, 'password'))}
        />

        {formError && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
