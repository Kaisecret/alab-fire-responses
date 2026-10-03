'use client';

import React, { Suspense } from 'react';
import { ProvincialReportConsole } from '../../_components/provincial-report-console';
import { SkeletonPage } from '../../_components/skeleton-loader';

export default function ProvincialReportsPage() {
  return (
    <div style={{ padding: '1.25rem 1.5rem 2.5rem', maxWidth: 1400, margin: '0 auto' }}>
      <Suspense fallback={<SkeletonPage label="Loading provincial reports" />}>
        <ProvincialReportConsole />
      </Suspense>
    </div>
  );
}
