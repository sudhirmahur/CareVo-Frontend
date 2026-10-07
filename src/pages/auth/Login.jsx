import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import AuthShell from '../../components/auth/AuthShell';
import SocialAuthButtons from '../../components/auth/SocialAuthButtons';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import { rules } from '../../utils/validators';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);
  const justRegistered = Boolean(location.state?.registered);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: location.state?.email ?? '', password: '', remember: true } });

  const onSubmit = async ({ email, password, remember }) => {
    setFormError(null);
    try {
      const user = await login({ email: email.trim(), password, remember });
      const from = location.state?.from?.pathname;
      navigate(from || ROLE_HOME[user.role] || '/dashboard', { replace: true });
    } catch (error) {
      setFormError(error.message);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue building your career."
      footer={
        <>
          New to Carevo?{' '}
          <Link to="/register" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {justRegistered && (
        <div role="status" className="mb-5 flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Account created. Sign in to get started.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          leftIcon={Lock}
          placeholder="Your password"
          error={errors.password?.message}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="rounded-lg p-2 text-muted hover:text-fg"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('password', { required: 'Password is required' })}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="h-4 w-4 rounded border-border accent-[rgb(var(--brand))]" {...register('remember')} />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>

        {formError && (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <SocialAuthButtons />
    </AuthShell>
  );
}
