"use client"

import { useState, useEffect } from "react"
import Image from "next/image" // Import Next.js Image
import { toast } from "sonner"
import { 
  Plus, 
  Trash2, 
  MapPin, 
  Users, 
  Image as ImageIcon, 
  Pencil, 
  UserCircle, 
  Loader2 
} from "lucide-react"
import api from "@/lib/axios"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"

// =======================
// CONFIG & HELPER
// =======================
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

function resolveImage(url: string) {
  if (!url) return ""
  if (url.startsWith("http")) return url
  return `${BACKEND_URL}${url}`
}

// =======================
// TYPES
// =======================
type Facility = {
  id: string
  name: string
  description: string
  location: string
  capacity: number
  price: number
  photo_url: string
  is_active: boolean
  // Field Baru dari Backend
  created_by_name: string
  updated_by_name: string
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  
  // State Modal & Form
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [capacity, setCapacity] = useState("")
  const [price, setPrice] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)

  const fetchFacilities = async () => {
    setLoading(true) // Set loading true saat refresh
    try {
      const res = await api.get("/facilities")
      setFacilities(res.data || []) 
    } catch (error) {
      console.error(error) // Fix: Log error agar variable terpakai
      toast.error("Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFacilities() }, [])

  const resetForm = () => {
    setName(""); setDescription(""); setLocation(""); 
    setCapacity(""); setPrice(""); setPhoto(null);
    setIsEditing(false); setEditId(null);
  }

  const handleOpenAdd = () => { resetForm(); setIsDialogOpen(true); }

  const handleOpenEdit = (item: Facility) => {
    setName(item.name)
    setDescription(item.description)
    setLocation(item.location)
    setCapacity(item.capacity.toString())
    setPrice(item.price.toString())
    setPhoto(null)
    setIsEditing(true); setEditId(item.id); setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("location", location)
      formData.append("capacity", capacity)
      formData.append("price", price)
      if (photo) formData.append("photo", photo)

      if (isEditing && editId) {
        await api.put(`/facilities/${editId}`, formData, { headers: { "Content-Type": "multipart/form-data" } })
        toast.success("Fasilitas diperbarui!")
      } else {
        await api.post("/facilities", formData, { headers: { "Content-Type": "multipart/form-data" } })
        toast.success("Fasilitas ditambahkan!")
      }
      setIsDialogOpen(false); resetForm(); fetchFacilities()
    } catch (error) {
      console.error(error) // Fix: Log error
      toast.error("Gagal menyimpan data.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus permanen data ini?")) return
    try {
      await api.delete(`/facilities/${id}`)
      toast.success("Dihapus permanen.")
      fetchFacilities()
    } catch (error) { 
      console.error(error) // Fix: Log error
      toast.error("Gagal menghapus.") 
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/facilities/${id}/status`, { is_active: !currentStatus })
      toast.success("Status diubah")
      fetchFacilities()
    } catch (error) { 
      console.error(error) // Fix: Log error
      toast.error("Gagal update status") 
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Kelola Fasilitas</h1>
          <p className="text-slate-500">Manajemen ruangan dan gedung</p>
        </div>
        <Button onClick={handleOpenAdd}><Plus className="mr-2 h-4 w-4" /> Tambah Fasilitas</Button>

        {/* Modal Form */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{isEditing ? "Edit Fasilitas" : "Tambah Baru"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nama</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Deskripsi</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Lokasi</Label><Input value={location} onChange={e => setLocation(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Kapasitas</Label><Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Harga</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Foto</Label><Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)} /></div>
              </div>
              <DialogFooter><Button type="submit">Simpan</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fasilitas</TableHead>
                <TableHead className="w-[200px]">Deskripsi</TableHead> 
                <TableHead>Detail</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Terakhir Update</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Fix: Menggunakan variable loading agar tidak warning
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex items-center justify-center text-slate-500">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : facilities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                    Tidak ada data fasilitas.
                  </TableCell>
                </TableRow>
              ) : (
                facilities.map((item) => (
                  <TableRow key={item.id} className={!item.is_active ? "bg-slate-50 opacity-75" : ""}>
                    <TableCell className="flex items-center gap-3">
                      {/* Fix: Menggunakan Next Image */}
                      <div className="relative w-12 h-12 overflow-hidden rounded-md border bg-slate-100 flex-shrink-0">
                        {item.photo_url ? (
                          <Image 
                            src={resolveImage(item.photo_url)} 
                            alt={item.name}
                            fill
                            className="object-cover"
                            unoptimized // Penting: Agar tidak error hostname config saat dev
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold">{item.name}</span>
                    </TableCell>

                    {/* Kolom Deskripsi */}
                    <TableCell>
                      <div className="text-xs text-slate-600 line-clamp-2" title={item.description}>
                          {item.description}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm space-y-1">
                          <div className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {item.location}</div>
                          <div className="flex items-center gap-1"><Users className="w-3 h-3"/> {item.capacity} Org</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                        <span className="font-medium text-green-700 text-sm">
                          {item.price > 0 ? `Rp ${item.price.toLocaleString("id-ID")}` : "Gratis"}
                        </span>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                          <Switch checked={item.is_active} onCheckedChange={() => handleToggleActive(item.id, item.is_active)} />
                      </div>
                    </TableCell>

                    {/* Kolom Created/Updated By */}
                    <TableCell>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <UserCircle className="w-4 h-4 text-slate-400" />
                          <div>
                              {item.updated_by_name ? (
                                  <>
                                      <span className="block font-medium">Updated by:</span>
                                      {item.updated_by_name}
                                  </>
                              ) : (
                                  <>
                                      <span className="block font-medium">Created by:</span>
                                      {item.created_by_name}
                                  </>
                              )}
                          </div>
                        </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}><Pencil className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}