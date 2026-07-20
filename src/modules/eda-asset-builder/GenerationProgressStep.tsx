import type { EdaBuilderJob, EdaBuilderJobEvent } from './types';

export function GenerationProgressStep({ job, events }: { job?: EdaBuilderJob; events: EdaBuilderJobEvent[] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={barWrap}>
        <div style={{ ...bar, width: `${job?.progress ?? 0}%` }} />
      </div>
      <div style={{ fontWeight: 800, color: '#245b3a' }}>{job?.message ?? 'No job started'}</div>
      <div style={{ display: 'grid', gap: 6, maxHeight: 280, overflow: 'auto' }}>
        {events.map((event) => (
          <div key={event.id} style={eventRow}>
            <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{new Date(event.at).toLocaleTimeString()}</span>
            <b>{event.status}</b>
            <span>{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const barWrap = { height: 12, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' } as const;
const bar = { height: '100%', background: 'linear-gradient(90deg,#2f8f55,#84cc16)', transition: 'width .2s ease' } as const;
const eventRow = { display: 'grid', gridTemplateColumns: '80px 160px 1fr', gap: 8, padding: 8, borderRadius: 8, background: '#f8fafc', fontSize: 11.5 } as const;
