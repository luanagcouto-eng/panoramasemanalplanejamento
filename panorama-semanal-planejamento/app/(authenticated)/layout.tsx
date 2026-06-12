import Sidebar from "@/components/layout/sidebar";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 print-content">{children}</main>
    </div>
  );
}
