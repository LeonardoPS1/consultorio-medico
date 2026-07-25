import { redirect } from 'next/navigation'
import { getSessionFromCookie } from '@/lib/auth'

export default async function HomePage() {
  const session = await getSessionFromCookie()
  if (session) {
    redirect('/dashboard')
  }
  redirect('/login')
}
