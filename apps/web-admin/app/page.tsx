import Link from 'next/link';

import { Card } from '../components/card';
import { apiGet } from '../lib/api';

export default async function DashboardPage(): Promise<JSX.Element> {
  const dashboard = await apiGet<Record<string, number>>('/team/sla-dashboard');

  return (
    <div>
      <h1 style={{ fontSize: 42, marginBottom: 8, color: '#1A3B2E' }}>Team Lead Dashboard</h1>
      <p style={{ color: '#5a5a5a' }}>Summary-first oversight for Active/At-Risk and stale rescue controls.</p>

      <Card>
        <h2>SLA Metrics</h2>
        <p>Tasks due today: {dashboard.tasks_due_today ?? 0}</p>
        <p>Tasks done today: {dashboard.tasks_done_today ?? 0}</p>
        <p>Active leads: {dashboard.active_leads ?? 0}</p>
        <p>Stale leads: {dashboard.stale_leads ?? 0}</p>
      </Card>

      <Card>
        <h2>Lead Oversight</h2>
        <p>Open a lead by ID to view derived profile and event metadata only.</p>
        <Link href="/leads/sample">Open Sample Lead</Link>
      </Card>
    </div>
  );
}
