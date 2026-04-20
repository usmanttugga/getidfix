import { AdminRoute } from '../../components/auth/AdminRoute';
import { AdminSidebar } from '../../components/layout/AdminSidebar';
import { TopBar } from '../../components/layout/TopBar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="flex h-screen bg-[#EEF1F6]">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminRoute>
  );
}
