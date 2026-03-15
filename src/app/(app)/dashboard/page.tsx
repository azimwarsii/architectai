import { redirect } from 'next/navigation'

// Projects list has moved into the /new page sidebar (ChatGPT-style layout)
export default function DashboardPage() {
  redirect('/new')
}
