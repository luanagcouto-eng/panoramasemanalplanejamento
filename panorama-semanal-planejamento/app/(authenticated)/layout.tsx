import { auth } from "@/auth";
import Sidebar from "@/components/layout/sidebar";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar userName={session?.user?.name} userEmail={session?.user?.email} />
      <main className="flex-1 print-content">{children}</main>
    </div>
  );
}
