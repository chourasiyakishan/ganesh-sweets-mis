import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col antialiased">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-[260px] transition-all duration-300">
        <Topbar />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>

        <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Ganesh Sweets Cloud MIS • Operational Intelligence Platform</p>
        </footer>
      </div>
    </div>
  )
}
