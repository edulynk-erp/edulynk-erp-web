import { redirect } from 'next/navigation';
import { requireSession } from '@/server/auth/guards';

export default async function PortalIndex() {
  await requireSession();
  redirect('/dashboard');
}
