// Full-screen canvas layout — covers the global (app) sidebar
export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0d0d14]">
      {children}
    </div>
  )
}
