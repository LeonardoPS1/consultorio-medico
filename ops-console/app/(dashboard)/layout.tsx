import { redirect } from 'next/navigation'
import { getSessionFromCookie } from '@/lib/auth'
import { Sidebar } from './sidebar'
import { Header } from './header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionFromCookie()
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar operatorNombre={session.nombre} operatorEmail={session.email} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header operatorNombre={session.nombre} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
