import { apiGet } from '../../../lib/api';
import { Card } from '../../../components/card';

interface PageProps {
  params: { id: string };
}

export default async function LeadPage({ params }: PageProps): Promise<JSX.Element> {
  const derived = await apiGet<Record<string, unknown>>(`/leads/${params.id}/derived`);
  const metadata = await apiGet<Array<Record<string, unknown>>>(`/leads/${params.id}/events/metadata`);

  return (
    <div>
      <h1 style={{ fontSize: 36, marginBottom: 10, color: '#1A3B2E' }}>Lead {params.id}</h1>
      <Card>
        <h2>Derived Profile</h2>
        <p><strong>Summary:</strong> {String(derived.summary ?? 'No summary')}</p>
        <p><strong>Language:</strong> {String(derived.language ?? 'n/a')}</p>
        <p><strong>State:</strong> {String(derived.state ?? 'n/a')}</p>
      </Card>
      <Card>
        <h2>Event Metadata</h2>
        <ul>
          {metadata.map((event) => (
            <li key={String(event.id)}>
              {String(event.created_at)} • {String(event.channel)} • {String(event.type)} • {String(event.direction)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
