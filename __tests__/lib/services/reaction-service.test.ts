import {
  aggregateReactions,
  getTopReactions,
  getTrendingReactions,
  getUserReactionStats,
  getChannelBreakdown,
  type ReactionEvent,
  type AggregatedReaction,
} from '@/lib/services/reaction-service'

const now = Math.floor(Date.now() / 1000)
const DAY = 86400

const createEvent = (overrides: Partial<ReactionEvent> = {}): ReactionEvent => ({
  emoji_name: 'thumbsup',
  count: 1,
  user_ids: ['U001'],
  channel_id: 'C001',
  timestamp: now - DAY,
  ...overrides,
})

describe('aggregateReactions', () => {
  it('should combine counts for the same emoji across events', () => {
    const events: ReactionEvent[] = [
      createEvent({ emoji_name: 'fire', count: 3 }),
      createEvent({ emoji_name: 'fire', count: 5 }),
      createEvent({ emoji_name: 'heart', count: 2 }),
    ]
    const result = aggregateReactions(events)
    const fire = result.find(r => r.emoji_name === 'fire')
    expect(fire).toBeDefined()
    expect(fire!.total_count).toBe(8)
    expect(result).toHaveLength(2)
  })

  it('should deduplicate user_ids across events', () => {
    const events: ReactionEvent[] = [
      createEvent({ emoji_name: 'fire', user_ids: ['U001', 'U002'] }),
      createEvent({ emoji_name: 'fire', user_ids: ['U002', 'U003'] }),
    ]
    const result = aggregateReactions(events)
    const fire = result.find(r => r.emoji_name === 'fire')
    expect(fire!.unique_users).toBe(3)
  })

  it('should return empty array for empty input', () => {
    expect(aggregateReactions([])).toEqual([])
  })
})

describe('getTopReactions', () => {
  it('should return reactions sorted by total_count descending', () => {
    const aggregated: AggregatedReaction[] = [
      { emoji_name: 'a', total_count: 5, unique_users: 2, events: [] },
      { emoji_name: 'b', total_count: 20, unique_users: 5, events: [] },
      { emoji_name: 'c', total_count: 10, unique_users: 3, events: [] },
    ]
    const top = getTopReactions(aggregated, 2)
    expect(top).toHaveLength(2)
    expect(top[0].emoji_name).toBe('b')
    expect(top[1].emoji_name).toBe('c')
  })
})

describe('getTrendingReactions', () => {
  it('should identify emojis with increased usage in recent period', () => {
    const events: ReactionEvent[] = [
      createEvent({ emoji_name: 'fire', count: 1, timestamp: now - 10 * DAY }),
      createEvent({ emoji_name: 'fire', count: 1, timestamp: now - 12 * DAY }),
      createEvent({ emoji_name: 'fire', count: 4, timestamp: now - 2 * DAY }),
      createEvent({ emoji_name: 'fire', count: 4, timestamp: now - 1 * DAY }),
    ]
    const trending = getTrendingReactions(events, 7 * DAY)
    expect(trending.length).toBeGreaterThanOrEqual(1)
    expect(trending[0].emoji_name).toBe('fire')
    expect(trending[0].change_percent).toBeGreaterThan(0)
  })
})

describe('getUserReactionStats', () => {
  it('should aggregate reactions per user', () => {
    const events: ReactionEvent[] = [
      createEvent({ user_ids: ['U001', 'U002'], count: 2 }),
      createEvent({ user_ids: ['U001'], count: 1 }),
    ]
    const stats = getUserReactionStats(events)
    const u1 = stats.find(s => s.user_id === 'U001')
    expect(u1!.reaction_count).toBe(2)
  })
})

describe('getChannelBreakdown', () => {
  it('should group top reactions by channel', () => {
    const events: ReactionEvent[] = [
      createEvent({ channel_id: 'C001', emoji_name: 'fire', count: 10 }),
      createEvent({ channel_id: 'C001', emoji_name: 'heart', count: 5 }),
      createEvent({ channel_id: 'C002', emoji_name: 'thumbsup', count: 20 }),
    ]
    const breakdown = getChannelBreakdown(events, 5)
    expect(breakdown).toHaveLength(2)
    const c1 = breakdown.find(b => b.channel_id === 'C001')
    expect(c1!.top_reactions[0].emoji_name).toBe('fire')
  })
})
