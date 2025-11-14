"use client";

import { ReactNode, useState, useEffect } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { ProductWizardProvider, useProductWizard } from "@/contexts/product-wizard-context";
import { ProductWizard } from "@/components/product-wizard";

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { startWizard } = useProductWizard();

  useEffect(() => {
    const handleOpenSidebar = () => {
      setIsMobileSidebarOpen(true);
    };

    const handleStartWizard = () => {
      startWizard();
    };

    window.addEventListener('openAdminSidebar', handleOpenSidebar);
    window.addEventListener('startProductWizard', handleStartWizard);

    return () => {
      window.removeEventListener('openAdminSidebar', handleOpenSidebar);
      window.removeEventListener('startProductWizard', handleStartWizard);
    };
  }, [startWizard]);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      {isMobileSidebarOpen && (
        <AdminSidebar 
          isMobile 
          onClose={() => setIsMobileSidebarOpen(false)} 
        />
      )}
      <main className="flex-1 lg:ml-64">
        {children}
      </main>
      <ProductWizard />
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProductWizardProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </ProductWizardProvider>
  );
}

