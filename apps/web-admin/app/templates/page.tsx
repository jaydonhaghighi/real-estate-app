import { Card } from '../../components/card';
import { apiGet } from '../../lib/api';

export default async function TemplatesPage(): Promise<JSX.Element> {
  const templates = await apiGet<Array<Record<string, unknown>>>('/team/templates');

  return (
    <div>
      <h1 style={{ fontSize: 36, marginBottom: 12, color: '#1A3B2E' }}>Team Templates</h1>
      {templates.map((template) => (
        <Card key={String(template.id)}>
          <h2>{String(template.name)}</h2>
          <p>{String(template.language)} • {String(template.channel)}</p>
          <p>{String(template.body)}</p>
        </Card>
      ))}
    </div>
  );
}
