"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Shield, User, Search, Trash2 } from "lucide-react"
import api from "@/lib/axios"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth" // Pastikan path ini benar, jika error gunakan "../hooks/use-auth"

type UserData = {
  id: string
  name: string
  email: string
  role: "admin" | "user"
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const { user: currentUser } = useAuth()

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users")
      setUsers(res.data || [])
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat data pengguna")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    const oldUsers = [...users]
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as "admin" | "user" } : u))
    try {
      await api.patch(`/users/${userId}/role`, { role: newRole })
      toast.success(`Role berhasil diubah menjadi ${newRole}`)
    } catch (error) {
      console.error(error)
      setUsers(oldUsers)
      toast.error("Gagal mengubah role")
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm("Yakin ingin menghapus user ini secara permanen?")) return
    try {
      await api.delete(`/users/${userId}`)
      setUsers(users.filter(u => u.id !== userId))
      toast.success("User berhasil dihapus")
    } catch (error) {
      console.error(error)
      toast.error("Gagal menghapus user")
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Data Pengguna</h1>
          <p className="text-slate-500">Kelola akses mahasiswa dan admin</p>
        </div>
        <div className="relative w-full md:w-72">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="Cari nama atau email..." 
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8 text-slate-500">Memuat data...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Pengguna</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status Saat Ini</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-slate-400 block md:hidden">{user.email}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{user.email}</TableCell>
                    <TableCell>
                      {user.role === "admin" ? (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200">
                           <Shield className="w-3 h-3 mr-1" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-600">
                          <User className="w-3 h-3 mr-1" /> User
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <div className="w-[140px]">
                                <Select 
                                    defaultValue={user.role} 
                                    onValueChange={(val) => handleRoleChange(user.id, val)}
                                    disabled={user.id === currentUser?.id}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User Biasa</SelectItem>
                                        <SelectItem value="admin">Administrator</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(user.id)}
                                disabled={user.id === currentUser?.id}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-slate-500">
                            Tidak ditemukan user dengan nama tersebut.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}