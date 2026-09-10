'use client';

import React, { Suspense } from 'react';
import { ProvincialResidentApplicationReview } from '../../_components/provincial-resident-application-review';

export default function ResidentApplicationsPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748B' }}>Loading Applications…</div>}>
        <ProvincialResidentApplicationReview />
      </Suspense>
    </div>
  );
}
