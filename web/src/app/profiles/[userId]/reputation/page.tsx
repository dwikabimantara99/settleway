import { ReputationPageClient } from '@/components/profile/ReputationPageClient';

export default async function ReputationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return <ReputationPageClient userId={userId} />;
}
