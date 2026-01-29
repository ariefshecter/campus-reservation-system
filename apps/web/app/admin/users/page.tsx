"use client";

import { useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  Eye,
  MapPin,
  Phone,
  Building2,
  UserCircle2,
  Shield,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Briefcase
} from "lucide-react";
import api from "@/lib/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/* =====================
   TYPES
===================== */

type UserRole = "admin" | "user";

type ProfileData = {
  full_name: string;
  phone_number: string;
  address: string;
  avatar_url: string;
  gender: string;
  identity_number: string;
  department: string;
  position: string;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  profile?: ProfileData;
};

// Tipe Data Detail untuk Modal (termasuk Stats)
type UserDetail = UserData & {
  created_at: string;
  stats: {
    on_time: number;
    late: number;
    no_show: number;
    total: number;
  };
};

type InfoProps = {
  icon: ReactNode;
  label: string;
  value?: string;
};

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
  );
}

/* =====================
   MODAL COMPONENT
===================== */

function UserDetailModal({ userId, open, onOpenChange }: { userId: string | null, open: boolean, onOpenChange: (open: boolean) => void }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Pastikan URL gambar valid
  const BACKEND_URL = "http://localhost:3000";
  const getAvatarUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `${BACKEND_URL}${path}`;
  };

  const getInitials = (name: string) =>
    name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??";

  useEffect(() => {
    const fetchDetail = async () => {
        setLoading(true);
        try {
          const res = await api.get(`/users/${userId}`);
          setUser(res.data);
        } catch {
          toast.error("Gagal memuat detail user");
        } finally {
          setLoading(false);
        }
    };

    if (open && userId) {
      fetchDetail();
    }
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] p-0 rounded-2xl overflow-hidden border-0 shadow-2xl gap-0 bg-white max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Detail User</DialogTitle>
        <DialogDescription className="sr-only">Info profil dan statistik</DialogDescription>

        {loading ? (
           <div className="h-60 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
           </div>
        ) : user ? (
           <>
              {/* HEADER (Profile Picture & Name) */}
              <div className="bg-slate-50/80 px-6 py-8 text-center border-b border-slate-100 relative">
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
                 <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                 
                 <div className="flex items-center justify-center gap-2 mt-3">
                    <Badge variant="outline" className="text-[10px] text-slate-500 font-medium px-2 h-5 bg-white border-slate-200">
                       {user.profile?.identity_number || "No ID"}
                    </Badge>
                    <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 px-2 h-5 shadow-none font-medium capitalize">
                       {user.profile?.position || user.role}
                    </Badge>
                 </div>
              </div>

              {/* BODY */}
              <div className="p-6 space-y-6">
                 
                 {/* STATISTIK KEHADIRAN (Dari booking scan) */}
                 <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
                       Statistik Kehadiran
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                       <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />
                          <span className="text-lg font-bold text-slate-700">{user.stats?.on_time ?? 0}</span>
                          <span className="text-[9px] text-slate-400 uppercase">Tepat</span>
                       </div>
                       <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <Clock className="w-4 h-4 text-yellow-500 mb-1" />
                          <span className="text-lg font-bold text-slate-700">{user.stats?.late ?? 0}</span>
                          <span className="text-[9px] text-slate-400 uppercase">Telat</span>
                       </div>
                       <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <XCircle className="w-4 h-4 text-red-500 mb-1" />
                          <span className="text-lg font-bold text-slate-700">{user.stats?.no_show ?? 0}</span>
                          <span className="text-[9px] text-slate-400 uppercase">Absen</span>
                       </div>
                    </div>
                    <div className="text-center text-[10px] text-slate-400 mt-2">
                       Total Booking: <b>{user.stats?.total ?? 0}</b> kali
                    </div>
                 </div>

                 {/* BIODATA */}
                 <div className="space-y-4">
                    <Info 
                       icon={<Building2 className="w-4 h-4" />} 
                       label="Jurusan" 
                       value={user.profile?.department} 
                    />
                    <Info 
                       icon={<Briefcase className="w-4 h-4" />} 
                       label="Status / Jabatan" 
                       value={user.profile?.position} 
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
                       icon={<MapPin className="w-4 h-4" />} 
                       label="Alamat Domisili" 
                       value={user.profile?.address} 
                    />
                    
                    <div className="pt-2 border-t border-slate-100 mt-2">
                       <p className="text-[10px] text-slate-400 text-center">
                          Terdaftar pada {format(new Date(user.created_at), "dd MMMM yyyy", { locale: idLocale })}
                       </p>
                    </div>
                 </div>
              </div>
           </>
        ) : (
           <div className="h-40 flex items-center justify-center text-slate-500">
              Data tidak ditemukan.
           </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* =====================
   MAIN PAGE COMPONENT
===================== */

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { user: currentUser } = useAuth();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const BACKEND_URL = "http://localhost:3000";

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users");
      setUsers(res.data || []);
    } catch {
      toast.error("Gagal memuat data pengguna");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const oldUsers = [...users];
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));

    try {
      await api.patch(`/users/${userId}/role`, { role: newRole });
      toast.success("Role berhasil diperbarui");
    } catch {
      setUsers(oldUsers);
      toast.error("Gagal mengubah role");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Yakin ingin menghapus user ini?")) return;
    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      toast.success("User berhasil dihapus");
    } catch {
      toast.error("Gagal menghapus user");
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getInitials = (name: string) =>
    name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "??";

  const getAvatarUrl = (path?: string) =>
    path ? (path.startsWith("http") ? path : `${BACKEND_URL}${path}`) : undefined;

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 space-y-8">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Data Pengguna
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola akses dan data mahasiswa.
          </p>
        </div>

        <div className="relative w-full md:w-80 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-hover:text-slate-500 transition-colors" />
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white text-slate-900 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm transition-all"
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm">Memuat data pengguna...</p>
            </div>
          ) : (
            <Table>
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
                        
                        {/* TOMBOL MATA (DETAIL & STATS) */}
                        {user.role === "user" && (
                           <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                              onClick={() => {
                                 setSelectedUserId(user.id);
                                 setIsModalOpen(true);
                              }}
                           >
                              <Eye className="w-3.5 h-3.5" />
                           </Button>
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

      <UserDetailModal 
         userId={selectedUserId} 
         open={isModalOpen} 
         onOpenChange={setIsModalOpen} 
      />

    </div>
  );
}