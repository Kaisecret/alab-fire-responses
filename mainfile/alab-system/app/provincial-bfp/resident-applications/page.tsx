'use client';

import React, { Suspense } from 'react';
import { ProvincialResidentApplicationReview } from '../../_components/provincial-resident-application-review';
import { SkeletonPage } from '../../_components/skeleton-loader';

export default function ResidentApplicationsPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<SkeletonPage label="Loading resident applications" />}>
        <ProvincialResidentApplicationReview />
      </Suspense>
    </div>
  );
}
