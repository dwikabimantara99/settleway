import { AuthForm } from '@/components/auth/AuthForm';

export const metadata = {
  title: 'Login - Settleway',
};

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <AuthForm />
    </div>
  );
}
