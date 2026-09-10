'use client';

import React, { Suspense } from 'react';
import { ProvincialStationDirectory } from '../../_components/provincial-station-directory';

export default function FiretrucksStationsPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading Provincial Stations…</div>}>
        <ProvincialStationDirectory />
      </Suspense>
    </div>
  );
}
