'use client'

import { useCallback } from 'react'
import { titleHue } from '@/lib/utils'

interface Props {
  title: string
  cover: string | null
  onPreviewShow: (cover: string, e: React.MouseEvent) => void
  onPreviewHide: () => void
}

export default function CoverArt({ title, cover, onPreviewShow, onPreviewHide }: Props) {
  const hasCover = !!cover

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (hasCover && cover) onPreviewShow(cover, e)
  }, [hasCover, cover, onPreviewShow])

  const initials = title.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const hue = titleHue(title)

  return (
    <div
      className="cover-wrap"
      data-has-cover={String(hasCover)}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseEnter}
      onMouseLeave={onPreviewHide}
    >
      {hasCover ? (
        <div className="cover">
          <div className="cover-blur" style={{ backgroundImage: `url('${cover}')` }} />
          <div className="cover-img"  style={{ backgroundImage: `url('${cover}')` }} />
        </div>
      ) : (
        <div
          className="cover"
          style={{ background: `linear-gradient(145deg,hsl(${hue},45%,22%),hsl(${(hue + 50) % 360},50%,14%))` }}
        >
          {initials}
        </div>
      )}
    </div>
  )
}
