import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let ratelimit: Ratelimit | undefined

/** POST /api/waitlist: 30 requests per IP per hour (sliding window). */
export function getWaitlistPostRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return null
  }
  if (!ratelimit) {
    const redis = new Redis({ url, token })
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 h'),
      prefix: 'waitlist:post',
    })
  }
  return ratelimit
}
