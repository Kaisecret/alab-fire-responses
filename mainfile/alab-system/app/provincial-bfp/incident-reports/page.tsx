'use client';

import React, { Suspense } from 'react';
import { ProvincialReportDirectory } from '../../_components/provincial-report-directory';

export default function IncidentReportsPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading Provincial Incident Reports…</div>}>
        <ProvincialReportDirectory />
      </Suspense>
    </div>
  );
}
