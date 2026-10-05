'use client';

import { Suspense } from 'react';
import { SkeletonPage } from '../../_components/skeleton-loader';
import { ProvincialBarangayCoordination } from '../../_components/provincial-barangay-coordination';

export default function IncidentClustersPage() {
  return (
    <Suspense fallback={<SkeletonPage label="Loading multiple incident coordination" style={{ padding: '10px 1.5rem 2.5rem' }} />}>
      <ProvincialBarangayCoordination />
    </Suspense>
  );
}
