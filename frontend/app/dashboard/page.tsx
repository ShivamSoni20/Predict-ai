'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./dashboard-client'), {
  ssr: false,
  loading: () => (
    <div id="dashboard" style={{ display: 'block', padding: '100px 40px', textAlign: 'center', background: '#0a0a0c', minHeight: '100vh' }}>
      <p style={{ color: '#c9a84c', fontFamily: 'monospace', fontSize: '16px' }}>
        LOADING WALLET-ENABLED AGENT TERMINAL...
      </p>
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardClient />;
}
