import type { ReactNode } from 'react'

interface Props {
  icon: ReactNode        // an inline <svg>, sized ~28px
  title: string
  description: string
  action?: ReactNode     // optional button / link
}

/** Centred empty / first-run panel shared across the list, reviews and discover views. */
export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '56px 24px', maxWidth: 420, margin: '0 auto' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent2)', marginBottom: 20 }}>
        {icon}
      </div>
      <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>{title}</h2>
      <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: action ? '0 0 24px' : 0 }}>{description}</p>
      {action}
    </div>
  )
}
