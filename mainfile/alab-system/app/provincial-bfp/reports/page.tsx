'use client';

import React, { Suspense } from 'react';
import { ProvincialReportConsole } from '../../_components/provincial-report-console';

export default function ProvincialReportsPage() {
  return (
    <div style={{ padding: '1.25rem 1.5rem 2.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading Provincial Incident Reports…</div>}>
        <ProvincialReportConsole />
      </Suspense>
    </div>
  );
}
