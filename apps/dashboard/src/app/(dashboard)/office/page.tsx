'use client';

import dynamic from 'next/dynamic';

const Office3D = dynamic(() => import('@/components/Office3D/Office3D'), {
  ssr: false,
  loading: () => (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: '#0a0a14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#FFCC00', fontFamily: 'monospace', fontSize: '1rem',
    }}>
      Loading 3D Office...
    </div>
  ),
});

export default function OfficePage() {
  return <Office3D />;
}
