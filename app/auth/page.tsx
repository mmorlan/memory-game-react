import { redirect } from 'next/navigation';

export default function AuthPage({
  searchParams,
}: {
  searchParams: { mode?: string };
}) {
  if (searchParams.mode === 'login') {
    redirect('/sign-in');
  }
  redirect('/register');
}
