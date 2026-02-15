"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  QrCode,
  CheckCircle,
  AlertCircle,
  Loader2,
  Share,
  Download,
  Camera,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { QRCodeCanvas } from "qrcode.react"
import toast, { Toaster } from "react-hot-toast"

interface Ticket {
  id: string
  event_id: string
  user_id: string
  ticket_code: string
  status: string
  event: {
    id: string
    title: string
    date_time: string
    location: string
    category: string
    description: string
  }
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchTickets = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return (window.location.href = "/auth/login")
      setUser(user)

      // Get user role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      
      setUserRole(profile?.role || null)

      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select(`id, event_id, registered_at, events (id, title, date_time, location, category, description)`)
        .eq("user_id", user.id)

      if (regError) {
        console.error(regError)
        setLoading(false)
        return
      }

      const ticketPromises = (registrations || []).map(async (reg: any) => {
        if (!reg.events || !reg.event_id) return null

        const { data: existingTicket } = await supabase
          .from("tickets")
          .select("*")
          .eq("event_id", reg.event_id)
          .eq("user_id", user.id)
          .maybeSingle()

        if (!existingTicket) {
          const ticketCode = `EVENT-${reg.event_id}-${user.id}`
          const { data: newTicket } = await supabase
            .from("tickets")
            .insert({ event_id: reg.event_id, user_id: user.id, ticket_code: ticketCode, status: "valid" })
            .select()
            .single()

          return newTicket ? { ...newTicket, event: reg.events } : null
        }
        return { ...existingTicket, event: reg.events }
      })

      const allTickets = (await Promise.all(ticketPromises)).filter(Boolean) as Ticket[]
      setTickets(allTickets)
      setLoading(false)
    }
    fetchTickets()
  }, [])

  const shareTicket = async (ticket: Ticket) => {
    if (!navigator.share) {
      navigator.clipboard.writeText(ticket.ticket_code)
      return toast.success("Ticket code copied")
    }
    try {
      await navigator.share({
        title: `Ticket: ${ticket.event.title}`,
        text: `My Ticket Code: ${ticket.ticket_code}`,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const downloadTicket = async (ticket: Ticket) => {
    const canvas = document.querySelector(`#qr-canvas-${ticket.id}`) as HTMLCanvasElement
    if (!canvas) return toast.error("QR code not found")

    const url = canvas.toDataURL("image/png")
    const link = document.createElement("a")
    link.href = url
    link.download = `ticket-${ticket.event.title.replace(/\s+/g, "-")}.png`
    link.click()
    toast.success("Ticket downloaded")
  }

  const TicketCard = ({ ticket, showQR = false }: { ticket: Ticket; showQR?: boolean }) => {
    if (!ticket || !ticket.event) return null
    
    const statusIcon = ticket.status === "valid" ? CheckCircle : AlertCircle
    const StatusIcon = statusIcon

    return (
      <Card className={`overflow-hidden border border-white/10 bg-white/[0.02] hover:border-[#7dd3c0]/80 transition-all ${selectedTicket?.id === ticket.id ? "ring-2 ring-[#7dd3c0]" : ""}`}>
        <div className="bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border-b border-white/10 p-6">
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-white/10 text-white border-white/20 text-[10px] uppercase tracking-[0.15em]">
              {ticket.event.category}
            </Badge>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${ticket.status === "valid" ? "bg-[#7dd3c0]/20 border border-[#7dd3c0]/50" : "bg-white/10 border border-white/20"}`}>
              <StatusIcon className={`w-3 h-3 ${ticket.status === "valid" ? "text-[#7dd3c0]" : "text-neutral-400"}`} />
              <span className={`text-[10px] font-medium uppercase tracking-[0.15em] ${ticket.status === "valid" ? "text-[#7dd3c0]" : "text-neutral-400"}`}>
                {ticket.status}
              </span>
            </div>
          </div>
          <h3 className="font-serif text-xl font-light mb-2 text-white">{ticket.event.title}</h3>
          <p className="text-neutral-400 text-xs uppercase tracking-[0.15em]">
            #{ticket.id.substring(0, 8)}
          </p>
        </div>

        <CardContent className="p-6">
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <Calendar className="w-4 h-4 text-neutral-500" />
              <span>{new Date(ticket.event.date_time).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <Clock className="w-4 h-4 text-neutral-500" />
              <span>{new Date(ticket.event.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-300">
              <MapPin className="w-4 h-4 text-neutral-500" />
              <span>{ticket.event.location}</span>
            </div>
          </div>

          {showQR && ticket.ticket_code && (
            <div className="mb-6">
              <div className="bg-white p-6 rounded inline-block mx-auto" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <QRCodeCanvas 
                  id={`qr-canvas-${ticket.id}`}
                  value={ticket.ticket_code} 
                  size={240} 
                  level="H" 
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-3 text-center">Show this QR code at event entrance</p>
              <p className="text-xs text-neutral-500 mt-1 text-center font-mono break-all px-4">{ticket.ticket_code}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {!showQR && (
              <button
                onClick={() => setSelectedTicket(ticket)}
                className="h-10 border border-white/10 hover:bg-gradient-to-r hover:from-[#7dd3c0]/20 hover:to-[#7dd3c0]/10 hover:border-[#7dd3c0] transition-all text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 text-white"
              >
                <QrCode className="w-3 h-3" />
                View QR
              </button>
            )}
            {showQR && (
              <>
                <button
                  onClick={() => downloadTicket(ticket)}
                  className="h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 text-white"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
                <button
                  onClick={() => shareTicket(ticket)}
                  className="h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 text-white"
                >
                  <Share className="w-3 h-3" />
                  Share
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border border-white/10 border-t-[#7dd3c0] rounded-full animate-spin mx-auto" />
          <p className="text-neutral-500 text-xs uppercase tracking-[0.2em]">Loading Tickets</p>
        </div>
      </div>
    )
  }

  const usedTickets = tickets.filter((t) => t.status === "used")

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}} />

      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/">
                <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h1 className="font-serif text-2xl font-light tracking-tight">My Tickets</h1>
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em] mt-0.5">
                  {tickets.length} Event{tickets.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* SCANNER BUTTON - Shows for admin/scanner role */}
            {(userRole === "admin" || userRole === "scanner") && (
              <Link href="/scanner">
                <button className="h-10 px-4 bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white hover:from-[#7dd3c0] hover:to-[#7dd3c0]/80 hover:text-black transition-all text-[10px] uppercase tracking-[0.15em] flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Scan Tickets
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-7xl mx-auto px-8 pb-16">
        {selectedTicket ? (
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setSelectedTicket(null)}
                className="h-10 px-4 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 text-white"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Tickets
              </button>
              <h2 className="font-serif text-2xl font-light tracking-tight">Event Ticket</h2>
            </div>
            <div className="max-w-md mx-auto">
              <TicketCard ticket={selectedTicket} showQR={true} />
            </div>
          </div>
        ) : (
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white/[0.02] border border-white/10 p-1">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7dd3c0]/10 data-[state=active]:to-transparent data-[state=active]:border data-[state=active]:border-[#427268] text-[10px] uppercase tracking-[0.15em] text-neutral-400 data-[state=active]:text-black"
                >
                  All ({tickets.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="used" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#7dd3c0]/10 data-[state=active]:to-transparent data-[state=active]:border data-[state=active]:border-[#7dd3c0] text-[10px] uppercase tracking-[0.15em] text-neutral-400 data-[state=active]:text-black"
                >
                  Used ({usedTickets.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                {tickets.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                  </div>
                ) : (
                  <div className="text-center py-32 border border-white/10">
                    <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <QrCode className="w-6 h-6 text-neutral-600" />
                    </div>
                    <p className="text-white text-xs uppercase tracking-[0.2em] mb-2">No Tickets Yet</p>
                    <p className="text-neutral-500 text-xs">Register for events to get tickets</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="used">
                {usedTickets.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {usedTickets.map(t => <TicketCard key={t.id} ticket={t} />)}
                  </div>
                ) : (
                  <div className="text-center py-32 border border-white/10">
                    <p className="text-neutral-500 text-xs">No used tickets</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  )
}