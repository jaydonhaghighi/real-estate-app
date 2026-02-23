'use client';

import { FormEvent, useState } from 'react';

import { apiPut } from '../../lib/api';

export default function RulesPage(): JSX.Element {
  const [threshold, setThreshold] = useState(80);
  const [message, setMessage] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await apiPut('/team/rules', {
      at_risk_threshold_percent: threshold,
      timezone: 'UTC'
    });
    setMessage('Rules saved');
  }

  return (
    <div>
      <h1 style={{ fontSize: 36, marginBottom: 12, color: '#1A3B2E' }}>SLA / Escalation Rules</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10, maxWidth: 340 }}>
        <label>
          At-Risk Threshold %
          <input
            type="number"
            min={1}
            max={99}
            value={threshold}
            onChange={(event) => {
              const target = event.target as EventTarget & { value: string };
              setThreshold(Number(target.value));
            }}
            style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #bbb' }}
          />
        </label>
        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 10,
            border: 'none',
            background: '#1F7A4C',
            color: '#fff',
            fontWeight: 700
          }}
        >
          Save Rules
        </button>
        {message ? <p>{message}</p> : null}
      </form>
    </div>
  );
}
