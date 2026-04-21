import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DashboardSidebar } from '../../components/layout/DashboardSidebar';
import { TopBar } from '../../components/layout/TopBar';
import { BottomNav } from '../../components/layout/BottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-[#EEF1F6]">
        {/* Sidebar — desktop only */}
        <DashboardSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          {/* Extra bottom padding on mobile for bottom nav */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
            {children}
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </ProtectedRoute>
  );
}
