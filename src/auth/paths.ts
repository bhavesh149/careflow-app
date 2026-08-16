import type { User } from '../api/types'

export function homeFor(user: User): string {
  return user.role === 'THERAPIST' ? '/dashboard' : '/book'
}
