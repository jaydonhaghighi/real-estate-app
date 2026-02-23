import { PropsWithChildren } from 'react';

export function Card({ children }: PropsWithChildren): JSX.Element {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #d8d2c7',
        borderRadius: 16,
        padding: 16,
        boxShadow: '0 8px 24px rgba(0,0,0,0.07)',
        marginBottom: 12
      }}
    >
      {children}
    </div>
  );
}
