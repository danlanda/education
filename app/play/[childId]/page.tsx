import GameHost from '@/components/GameHost';

export default async function PlayPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  return <GameHost childId={childId} />;
}
