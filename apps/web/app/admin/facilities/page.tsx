"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { toast } from "sonner"
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Pencil, 
  Loader2, 
  X,
  Search,
  Building2
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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
  photo_url: string[] 
  is_active: boolean
  created_by_name: string
  updated_by_name: string
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // State Modal & Form
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [capacity, setCapacity] = useState("")
  const [price, setPrice] = useState("")
  
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]) 
  const [newPhotos, setNewPhotos] = useState<File[]>([]) 

  const fetchFacilities = async () => {
    setLoading(true)
    try {
      const res = await api.get("/facilities")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeData = (res.data || []).map((f: any) => ({
        ...f,
        photo_url: Array.isArray(f.photo_url) ? f.photo_url : []
      }))
      setFacilities(safeData) 
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchFacilities() }, [])

  const resetForm = () => {
    setName(""); setDescription(""); setLocation(""); 
    setCapacity(""); setPrice(""); 
    setNewPhotos([]); setExistingPhotos([]);
    setIsEditing(false); setEditId(null);
  }

  const handleOpenAdd = () => { resetForm(); setIsDialogOpen(true); }

  const handleOpenEdit = (item: Facility) => {
    setName(item.name)
    setDescription(item.description)
    setLocation(item.location)
    setCapacity(item.capacity.toString())
    setPrice(item.price.toString())
    setExistingPhotos(item.photo_url || [])
    setNewPhotos([])
    setIsEditing(true); setEditId(item.id); setIsDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files)
      const total = [...newPhotos, ...selected].slice(0, 4)
      setNewPhotos(total)
    }
  }

  const removeNewPhoto = (index: number) => {
    setNewPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // [FIX] Validasi Manual
    if (!name.trim()) {
      toast.error("Nama fasilitas tidak boleh kosong")
      return
    }
    if (!capacity || parseInt(capacity) <= 0) {
      toast.error("Kapasitas harus angka dan lebih dari 0")
      return
    }

    try {
      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("location", location)
      formData.append("capacity", capacity)
      formData.append("price", price)
      
      newPhotos.forEach((file) => {
        formData.append("photos", file)
      })

      if (isEditing && editId) {
        await api.put(`/facilities/${editId}`, formData, { headers: { "Content-Type": "multipart/form-data" } })
        toast.success("Fasilitas berhasil diperbarui")
      } else {
        await api.post("/facilities", formData, { headers: { "Content-Type": "multipart/form-data" } })
        toast.success("Fasilitas baru ditambahkan")
      }
      setIsDialogOpen(false); resetForm(); fetchFacilities()
    } catch (error) {
      console.error(error)
      toast.error("Gagal menyimpan data")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus permanen? Data tidak bisa dikembalikan.")) return
    try {
      await api.delete(`/facilities/${id}`)
      toast.success("Data dihapus")
      fetchFacilities()
    } catch (error) { console.error(error); toast.error("Gagal menghapus") }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/facilities/${id}/status`, { is_active: !currentStatus })
      toast.success(currentStatus ? "Dinonaktifkan" : "Diaktifkan")
      fetchFacilities()
    } catch (error) { console.error(error); toast.error("Gagal update status") }
  }

  // Filter Search
  const filteredData = facilities.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-white p-6 md:p-10 space-y-8">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fasilitas Kampus</h1>
          <p className="text-slate-500 text-sm mt-1">Kelola daftar ruangan dan gedung untuk peminjaman.</p>
        </div>
        
        {/* ACTION TOOLBAR */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari fasilitas..."
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-all text-slate-900"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={handleOpenAdd} className="bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Baru
          </Button>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-b border-slate-200">
              <TableHead className="w-[320px] pl-6 py-4 text-slate-700 font-semibold">Fasilitas</TableHead>
              <TableHead className="text-slate-700 font-semibold">Lokasi</TableHead>
              <TableHead className="text-slate-700 font-semibold">Kapasitas</TableHead>
              <TableHead className="text-slate-700 font-semibold">Harga</TableHead>
              <TableHead className="text-slate-700 font-semibold">Status</TableHead>
              <TableHead className="text-slate-700 font-semibold">Log Audit</TableHead>
              <TableHead className="text-right pr-6 text-slate-700 font-semibold">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
                    <span className="text-xs">Memuat data...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="h-8 w-8 text-slate-200" />
                    <p>Tidak ada fasilitas ditemukan.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id} className="group hover:bg-slate-50/60 transition-colors border-b border-slate-50 last:border-0">
                  {/* KOLOM 1: FOTO & NAMA */}
                  <TableCell className="pl-6 py-4 align-top">
                    <div className="flex gap-4">
                      {/* Thumbnail Foto Utama */}
                      <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shadow-sm">
                        {item.photo_url && item.photo_url.length > 0 ? (
                          <>
                            <Image 
                              src={resolveImage(item.photo_url[0])} 
                              alt={item.name} 
                              fill 
                              className="object-cover"
                              unoptimized 
                            />
                            {item.photo_url.length > 1 && (
                              <div className="absolute bottom-0 right-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-tl-md font-medium backdrop-blur-sm">
                                +{item.photo_url.length - 1}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full text-slate-300">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors cursor-pointer" onClick={() => handleOpenEdit(item)}>
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed max-w-[180px]" title={item.description}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* KOLOM 2: LOKASI */}
                  <TableCell className="py-4 align-top">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                       <span className="truncate max-w-[120px]" title={item.location}>{item.location}</span>
                    </div>
                  </TableCell>

                  {/* KOLOM 3: KAPASITAS */}
                  <TableCell className="py-4 align-top">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                       <span>{item.capacity} Org</span>
                    </div>
                  </TableCell>

                  {/* KOLOM 4: HARGA */}
                  <TableCell className="py-4 align-top">
                    {item.price > 0 ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0 font-normal">
                        Rp {item.price.toLocaleString("id-ID")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 font-normal border-slate-200">
                        Gratis
                      </Badge>
                    )}
                  </TableCell>

                  {/* KOLOM 5: STATUS */}
                  <TableCell className="py-4 align-top">
                    <div className="flex items-center gap-2">
                        <Switch 
                          checked={item.is_active} 
                          onCheckedChange={() => handleToggleActive(item.id, item.is_active)}
                          className="scale-75 origin-left data-[state=checked]:bg-emerald-500" 
                        />
                        <span className={`text-xs ${item.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {item.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                    </div>
                  </TableCell>

                  {/* KOLOM 6: LOG AUDIT */}
                  <TableCell className="py-4 align-top">
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                       <div className="flex flex-col">
                           {item.updated_by_name ? (
                               <>
                                   <span className="text-[10px] text-slate-400">Updated by</span>
                                   <span className="font-medium text-slate-700">{item.updated_by_name}</span>
                               </>
                           ) : (
                               <>
                                   <span className="text-[10px] text-slate-400">Created by</span>
                                   <span className="font-medium text-slate-700">{item.created_by_name}</span>
                               </>
                           )}
                       </div>
                    </div>
                  </TableCell>

                  {/* KOLOM 7: AKSI */}
                  <TableCell className="pr-6 py-4 align-top text-right">
                    <div className="flex justify-end items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Data"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100"
                        onClick={() => handleDelete(item.id)}
                        title="Hapus Permanen"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* MODAL DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-white border-none shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              {isEditing ? <Pencil className="h-5 w-5 text-indigo-600"/> : <Plus className="h-5 w-5 text-indigo-600"/>}
              {isEditing ? "Edit Fasilitas" : "Tambah Fasilitas"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {isEditing ? "Perbarui informasi fasilitas yang sudah ada." : "Tambahkan ruangan atau gedung baru ke dalam sistem."}
            </DialogDescription>
          </DialogHeader>
          
          {/* [FIX] Tambahkan id="facility-form" */}
          <form id="facility-form" onSubmit={handleSubmit} className="px-6 py-6 space-y-6 overflow-y-auto max-h-[75vh]">
            
            {/* SECTION 1: Detail Umum */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-6 w-1 bg-indigo-500 rounded-full"></div>
                 <h3 className="text-sm font-semibold text-slate-900">Detail Umum</h3>
              </div>
              
              <div className="grid gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nama Fasilitas</Label>
                  <Input 
                    value={name} onChange={e => setName(e.target.value)} required 
                    placeholder="Contoh: Auditorium Utama"
                    className="bg-white text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Deskripsi</Label>
                  <Textarea 
                    value={description} onChange={e => setDescription(e.target.value)} required 
                    placeholder="Deskripsi singkat fasilitas..."
                    className="bg-white text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 resize-none h-20"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* SECTION 2: Spesifikasi */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                 <div className="h-6 w-1 bg-emerald-500 rounded-full"></div>
                 <h3 className="text-sm font-semibold text-slate-900">Spesifikasi & Harga</h3>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lokasi</Label>
                  <Input 
                    value={location} onChange={e => setLocation(e.target.value)} required 
                    placeholder="Gedung, Lantai..."
                    className="bg-white text-slate-900 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Kapasitas</Label>
                  <div className="relative">
                    <Input 
                      type="number" value={capacity} onChange={e => setCapacity(e.target.value)} required 
                      placeholder="0"
                      className="bg-white text-slate-900 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">Org</span>
                  </div>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Harga Sewa</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-medium">Rp</span>
                    <Input 
                      type="number" value={price} onChange={e => setPrice(e.target.value)} required 
                      placeholder="0"
                      className="pl-9 bg-white text-slate-900 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">Masukkan 0 jika gratis.</p>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* SECTION 3: Galeri */}
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                 <div className="flex items-center gap-2">
                    <div className="h-6 w-1 bg-blue-500 rounded-full"></div>
                    <h3 className="text-sm font-semibold text-slate-900">Galeri Foto</h3>
                 </div>
                 <Badge variant="secondary" className="text-[10px] font-normal bg-blue-50 text-blue-700 hover:bg-blue-100">
                   Max 4 Foto
                 </Badge>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {newPhotos.length < 4 && (
                  <label className="border-2 border-dashed border-slate-200 rounded-xl h-24 w-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all group bg-slate-50/50">
                    <div className="bg-white p-1.5 rounded-full shadow-sm mb-1 group-hover:scale-110 transition-transform">
                      <Plus className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Upload</span>
                    <input 
                      type="file" accept="image/*" multiple className="hidden" 
                      onChange={handleFileChange} 
                      disabled={newPhotos.length >= 4}
                    />
                  </label>
                )}

                {/* Preview Baru */}
                {newPhotos.map((file, idx) => (
                  <div key={`new-${idx}`} className="relative h-24 w-full border border-slate-200 rounded-xl overflow-hidden group bg-white shadow-sm">
                      <Image src={URL.createObjectURL(file)} alt="preview" fill className="object-cover" unoptimized />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <button 
                      type="button"
                      onClick={() => removeNewPhoto(idx)}
                      className="absolute top-1 right-1 bg-white text-red-500 hover:bg-red-50 p-1 rounded-full shadow-sm opacity-100 transform scale-90 hover:scale-100 transition-all"
                      title="Hapus foto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                  </div>
                ))}

                {/* Preview Lama */}
                {isEditing && newPhotos.length === 0 && existingPhotos.map((url, idx) => (
                  <div key={`old-${idx}`} className="relative h-24 w-full border border-slate-200 rounded-xl overflow-hidden opacity-70 grayscale-[30%]">
                      <Image src={resolveImage(url)} alt="old" fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
              
              {isEditing && newPhotos.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-lg border border-amber-100">
                   <div className="text-amber-500 mt-0.5"><Trash2 className="h-3 w-3" /></div>
                   <p className="text-xs text-amber-700 leading-tight">
                     Anda memilih foto baru. <strong>Semua foto lama akan dihapus</strong> dan digantikan dengan foto yang baru Anda pilih.
                   </p>
                </div>
              )}
            </div>

          </form>
          
          <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
             <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-slate-600 hover:bg-slate-200/50">
               Batal
             </Button>
             {/* [FIX] Tambahkan form="facility-form" dan hapus onClick */}
             <Button type="submit" form="facility-form" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95">
               {isEditing ? "Simpan Perubahan" : "Simpan Fasilitas"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}