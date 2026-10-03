'use client';

import React, { Suspense } from 'react';
import { ProvincialReportDirectory } from '../../_components/provincial-report-directory';
import { SkeletonPage } from '../../_components/skeleton-loader';

export default function IncidentReportsPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<SkeletonPage label="Loading provincial incident reports" />}>
        <ProvincialReportDirectory />
      </Suspense>
    </div>
  );
}
