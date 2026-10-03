'use client';

import React, { Suspense } from 'react';
import { ProvincialPersonnelDirectory } from '../../_components/provincial-personnel-directory';
import { SkeletonPage } from '../../_components/skeleton-loader';

export default function RespondersPage() {
  return (
    <div style={{ padding: '10px 1.5rem 2.5rem', background: '#EEF5FD', minHeight: '100%' }}>
      <Suspense fallback={<SkeletonPage label="Loading provincial personnel" />}>
        <ProvincialPersonnelDirectory />
      </Suspense>
    </div>
  );
}
