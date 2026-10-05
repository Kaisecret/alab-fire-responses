import { redirect } from 'next/navigation';

// Multiple Incidents moved into Assistance Requests as a tab; old links land there.
export default async function IncidentClustersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { alert } = await searchParams;
  const params = new URLSearchParams({ view: 'incidents' });
  if (typeof alert === 'string') params.set('alert', alert);
  redirect(`/provincial-bfp/assistance-requests?${params.toString()}`);
}
