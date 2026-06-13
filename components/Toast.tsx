'use client'

import { useEffect, useState } from 'react'

interface Props {
  message: string
  onClear: () => void
}

export default function Toast({ message, onClear }: Props) {
  // Keep the last non-empty message so the text stays visible while sliding out
  const [lastMsg, setLastMsg] = useState(message)
  if (message && message !== lastMsg) setLastMsg(message)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClear, 2400)
    return () => clearTimeout(t)
  }, [message, onClear])

  return (
    <div id="toast" className={message ? 'show' : ''}>
      {lastMsg}
    </div>
  )
}
