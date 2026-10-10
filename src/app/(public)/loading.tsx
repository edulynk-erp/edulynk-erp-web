import { CardSkeleton } from '@/components/feedback/page-skeleton';

export default function PublicLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <CardSkeleton />
    </div>
  );
}
