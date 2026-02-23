import { Card } from '../../components/card';
import { apiGet } from '../../lib/api';

export default async function RescuePage(): Promise<JSX.Element> {
  const sequences = await apiGet<Array<Record<string, unknown>>>('/team/rescue-sequences');

  return (
    <div>
      <h1 style={{ fontSize: 36, marginBottom: 12, color: '#1A3B2E' }}>Stale Rescue Queue</h1>
      <Card>
        <h2>Configured Rescue Sequences</h2>
        <ul>
          {sequences.map((sequence) => (
            <li key={String(sequence.id)}>{String(sequence.name)} ({String(sequence.language)})</li>
          ))}
        </ul>
      </Card>
      <Card>
        <p>Automation mode: task-only. All send/call actions require explicit human initiation.</p>
      </Card>
    </div>
  );
}
