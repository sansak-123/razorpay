import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";
import { getEnvStatus } from "@/lib/envStatus";
import { requireUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const envStatus = getEnvStatus();

  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar envStatus={envStatus} userEmail={user.email ?? null} />
        <main className="flex-1 px-5 md:px-8 pt-20 md:pt-8 pb-24 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
