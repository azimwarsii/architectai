import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Each page manages its own navigation.
// Canvas: full-screen dark layout with project sidebar.
// Dashboard/new: tinyfish-style topbar.
// Validate/ideate/questions: inline back-nav.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <>{children}</>
}
