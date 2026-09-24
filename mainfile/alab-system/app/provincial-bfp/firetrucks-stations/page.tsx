'use client';

import React, { Suspense } from 'react';
import { ProvincialFiretrucksStations } from '../../_components/provincial-firetrucks-stations';

export default function FiretrucksStationsPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading fire trucks and stations…</div>}>
        <ProvincialFiretrucksStations />
      </Suspense>
    </div>
  );
}
