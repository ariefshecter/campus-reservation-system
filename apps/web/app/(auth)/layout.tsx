export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Background Global khusus untuk halaman Auth (Login & Register)
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(900px_circle_at_20%_10%,#1e3f78,transparent_45%),radial-gradient(700px_circle_at_80%_20%,#102b52,transparent_50%),linear-gradient(180deg,#071a33,#041225)]">
      {children}
    </div>
  )
}