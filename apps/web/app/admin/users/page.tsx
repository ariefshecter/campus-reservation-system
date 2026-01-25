"use client"

import { useState, useEffect, ReactNode } from "react"
import { toast } from "sonner"
import {
  Search,
  Trash2,
  Eye,
  MapPin,
  Phone,
  Building2,
  UserCircle2,
  Mail,
  Shield,
  User,
} from "lucide-react"
import api from "@/lib/axios"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// Card diganti dengan Div biasa agar border style sama dengan FacilitiesPage
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"

/* =====================
   TYPES
===================== */

type ProfileData = {
  full_name: string
  phone_number: string
  address: string
  avatar_url: string
  gender: string
  identity_number: string
  department: string
  position: string
}

type UserRole = "admin" | "user"

type UserData = {
  id: string
  name: string
  email: string
  role: UserRole
  profile?: ProfileData
}

type InfoProps = {
  icon: ReactNode
  label: string
  value?: string
}

/* =====================
   HELPER COMPONENTS
===================== */

function Info({ icon, label, value }: InfoProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
          {label}
        </p>
        <p className="text-sm font-medium text-slate-800 break-words leading-snug">
          {value || "-"}
        </p>
      </div>
    </div>
  )
}

/* =====================
   MAIN PAGE COMPONENT
===================== */

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const { user: currentUser } = useAuth()

  // Sesuaikan port backend (3000 atau 8080)
  const BACKEND_URL = "http://localhost:3000"

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users")
      setUsers(res.data || [])
    } catch {
      toast.error("Gagal memuat data pengguna")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const oldUsers = [...users]
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))

    try {
      await api.patch(`/users/${userId}/role`, { role: newRole })
      toast.success("Role berhasil diperbarui")
    } catch {
      setUsers(oldUsers)
      toast.error("Gagal mengubah role")
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("Yakin ingin menghapus user ini?")) return
    try {
      await api.delete(`/users/${userId}`)
      setUsers(users.filter(u => u.id !== userId))
      toast.success("User berhasil dihapus")
    } catch {
      toast.error("Gagal menghapus user")
    }
  }

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  const getInitials = (name: string) =>
    name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??"

  const getAvatarUrl = (path?: string) =>
    path ? (path.startsWith("http") ? path : `${BACKEND_URL}${path}`) : undefined

  return (
    // UBAH: Background jadi white, padding disesuaikan
    <div className="min-h-screen bg-white p-6 md:p-10 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          {/* UBAH: Text color slate-900 agar lebih tajam */}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Data Pengguna
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola akses dan data mahasiswa.
          </p>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-hover:text-slate-500 transition-colors" />
          {/* UBAH: Input bg-slate-50 border-slate-200 fokus ke putih (gaya Facilities) */}
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      {/* UBAH: Menggunakan div border rounded-xl (bukan Card) untuk konsistensi border */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
              <p className="text-sm">Memuat data pengguna...</p>
            </div>
          ) : (
            <Table>
              {/* UBAH: Header bg-slate-50/50 dan text font-semibold slate-700 */}
              <TableHeader className="bg-slate-50/50 border-b border-slate-200">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="pl-6 w-[300px] py-4 text-slate-700 font-semibold">User</TableHead>
                  <TableHead className="hidden md:table-cell text-slate-700 font-semibold">Email</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Role Access</TableHead>
                  <TableHead className="text-right pr-6 text-slate-700 font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredUsers.map(user => (
                  // UBAH: Hover effect lebih halus, border-b slate-50
                  <TableRow key={user.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-50 last:border-0">
                    <TableCell className="pl-6 py-4 align-middle">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-100 shadow-sm">
                          <AvatarImage 
                              src={getAvatarUrl(user.profile?.avatar_url)} 
                              className="object-cover h-full w-full"
                          />
                          <AvatarFallback className="bg-slate-100 text-slate-600 font-medium text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          {/* UBAH: Text slate-900 */}
                          <p className="font-medium text-sm text-slate-900">{user.name}</p>
                          <p className="text-[10px] text-slate-500 md:hidden">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell text-sm text-slate-600">
                      {user.email}
                    </TableCell>

                    <TableCell className="align-middle">
                      <Select
                        defaultValue={user.role}
                        disabled={user.id === currentUser?.id}
                        onValueChange={(val) =>
                          handleRoleChange(user.id, val as UserRole)
                        }
                      >
                        {/* UBAH: SelectTrigger style disesuaikan agar mirip Badge harga di Facilities */}
                        <SelectTrigger className={`h-7 w-[130px] text-[11px] font-medium border shadow-sm px-2 transition-all ${
                           user.role === 'admin' 
                           ? 'bg-purple-50 border-purple-200 text-purple-700' 
                           : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <div className="flex items-center gap-1.5">
                              {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                              <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>

                    <TableCell className="text-right pr-6 align-middle">
                      <div className="inline-flex gap-1 justify-end">
                        {user.role === "user" && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>

                            {/* POP UP */}
                            <DialogContent className="max-w-[380px] p-0 rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 bg-white">
                              
                              {/* Header Abu-abu (Updated color) */}
                              <DialogTitle className="sr-only">Detail User</DialogTitle>
                              <div className="bg-slate-50/50 px-6 py-8 text-center border-b border-slate-100">
                                <Avatar className="h-24 w-24 mx-auto mb-3 border-[4px] border-white shadow-md bg-white rounded-full">
                                  <AvatarImage 
                                      src={getAvatarUrl(user.profile?.avatar_url)} 
                                      className="object-cover h-full w-full"
                                  />
                                  <AvatarFallback className="bg-slate-200 text-slate-500 text-2xl">
                                    {getInitials(user.profile?.full_name || user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                
                                <h2 className="text-lg font-bold text-slate-900 leading-tight px-4">
                                  {user.profile?.full_name || user.name}
                                </h2>
                                
                                <div className="flex items-center justify-center gap-2 mt-2">
                                   <Badge variant="outline" className="text-[10px] text-slate-500 font-medium px-2 h-5 bg-white border-slate-200">
                                      {user.profile?.identity_number || "-"}
                                   </Badge>
                                   <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 px-2 h-5 shadow-none font-medium">
                                      {user.profile?.position || "Mahasiswa"}
                                   </Badge>
                                </div>
                                <DialogDescription className="sr-only">Detail profil pengguna</DialogDescription>
                              </div>

                              {/* Body Putih dengan Info */}
                              <div className="p-6 space-y-5 bg-white">
                                <Info 
                                  icon={<Building2 className="w-4 h-4" />} 
                                  label="Jurusan" 
                                  value={user.profile?.department} 
                                />
                                <Info 
                                  icon={<UserCircle2 className="w-4 h-4" />} 
                                  label="Jenis Kelamin" 
                                  value={user.profile?.gender === 'L' ? 'Laki-laki' : user.profile?.gender === 'P' ? 'Perempuan' : user.profile?.gender} 
                                />
                                <Info 
                                  icon={<Phone className="w-4 h-4" />} 
                                  label="Telepon" 
                                  value={user.profile?.phone_number} 
                                />
                                <Info 
                                  icon={<Mail className="w-4 h-4" />} 
                                  label="Email Akun" 
                                  value={user.email} 
                                />
                                <Info 
                                  icon={<MapPin className="w-4 h-4" />} 
                                  label="Alamat Domisili" 
                                  value={user.profile?.address} 
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(user.id)}
                          disabled={user.id === currentUser?.id}
                          className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {filteredUsers.length === 0 && (
                   <TableRow>
                      <TableCell colSpan={4} className="h-40 text-center text-slate-500">
                         <div className="flex flex-col items-center gap-2">
                            <User className="h-8 w-8 text-slate-200" />
                            <p>Data tidak ditemukan.</p>
                         </div>
                      </TableCell>
                   </TableRow>
                )}
              </TableBody>
            </Table>
          )}
      </div>
    </div>
  )
}