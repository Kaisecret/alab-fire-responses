'use client';

import React, { Suspense } from 'react';
import { ProvincialFiretrucksStations } from '../../_components/provincial-firetrucks-stations';
import { SkeletonPage } from '../../_components/skeleton-loader';

export default function FiretrucksStationsPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<SkeletonPage label="Loading fire trucks and stations" />}>
        <ProvincialFiretrucksStations />
      </Suspense>
    </div>
  );
}
