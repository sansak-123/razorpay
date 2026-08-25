import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";
import { getEnvStatus } from "@/lib/envStatus";

// The shared shell for all 5 dashboard routes. A route group ((dashboard))
// so this adds zero URL segments -- "/" still resolves to Overview, and
// src/app/api/report/route.ts sits outside the group entirely, untouched.
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  const envStatus = getEnvStatus();

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar envStatus={envStatus} />
        <main className="flex-1 px-5 md:px-8 pt-20 md:pt-8 pb-24 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
