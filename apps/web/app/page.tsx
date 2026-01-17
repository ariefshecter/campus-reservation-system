import Link from "next/link" // Tambahkan import ini
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-50">
      <Card className="w-[380px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-800">
            Sistem Reservasi
          </CardTitle>
          <p className="text-sm text-slate-500">Universitas Nahdlatul Ulama Lampung</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="p-4 bg-green-50 text-green-700 text-sm rounded-md border border-green-200 text-center">
            ✅ Frontend berjalan di port 3001
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Update Bagian Ini */}
            <Link href="/login" className="w-full">
              <Button className="w-full">Masuk</Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full">Daftar</Button>
            </Link>
          </div>
          
        </CardContent>
      </Card>
    </main>
  )
}