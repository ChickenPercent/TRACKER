import { NextRequest, NextResponse } from 'next/server'
import { getGame, coverUrl, mapPlatforms } from '@/lib/igdb'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const numId = parseInt(id, 10)
  if (isNaN(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const g = await getGame(numId)
    if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({
      id: g.id,
      name: g.name,
      slug: g.slug,
      cover: g.cover ? coverUrl(g.cover.image_id) : null,
      release_date: g.first_release_date
        ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
        : null,
      platforms: mapPlatforms(g.platforms),
      rating: g.aggregated_rating ? Math.round(g.aggregated_rating * 10) / 10 : null,
      summary: g.summary ?? null,
    })
  } catch (err) {
    console.error('IGDB game error:', err)
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
  }
}
