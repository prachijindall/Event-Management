"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Camera,
  X,
  Share,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { QRCodeCanvas } from "qrcode.react"

declare global {
  interface Window {
    jsQR: any
  }
}

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
    event_qr_code: string
  }
}

const statusConfig = {
  valid: { icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100", label: "Valid" },
  pending: { icon: AlertCircle, color: "text-yellow-600", bgColor: "bg-yellow-100", label: "Pending" },
  used: { icon: CheckCircle, color: "text-blue-600", bgColor: "bg-blue-100", label: "Used" },
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [activeTab, setActiveTab] = useState("my-tickets")
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanLoading, setScanLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningRef = useRef(false)

  const supabase = createClient()

  useEffect(() => {
  const script = document.createElement("script")
  script.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"
  script.async = true
  document.body.appendChild(script)

  return () => {
    document.body.removeChild(script)
  }
}, [])


  useEffect(() => {
    const fetchTickets = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return (window.location.href = "/auth/login")
      setUser(user)
      setUserRole(user.user_metadata?.role || null)

      const { data: registrations, error: regError } = await supabase
        .from("event_registrations")
        .select(
          `id, event_id, registered_at, events (id, title, date_time, location, category, description, event_qr_code)`,
        )
        .eq("user_id", user.id)

      if (regError) return console.error(regError)

      const ticketPromises = (registrations || []).map(async (reg: any) => {
        const { data: existingTicket } = await supabase
          .from("tickets")
          .select("*")
          .eq("event_id", reg.event_id)
          .eq("user_id", user.id)
          .single()

        if (!existingTicket) {
          const ticketCode = `${reg.event_id}-${user.id}-${Date.now()}`
          const { data: newTicket } = await supabase
            .from("tickets")
            .insert({ event_id: reg.event_id, user_id: user.id, ticket_code: ticketCode, status: "valid" })
            .select()
            .single()

          return { ...newTicket, event: reg.events }
        }
        return { ...existingTicket, event: reg.events }
      })

      const allTickets = await Promise.all(ticketPromises)
      setTickets(allTickets as Ticket[])
      setLoading(false)
    }
    fetchTickets()
  }, [])

  const startCameraStream = async () => {
    try {
      setScanResult(null)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        scanningRef.current = true
        setTimeout(() => scanQRCode(), 500)
      }
    } catch (error) {
      console.error(error)
      alert("Camera access denied. Please enable camera permissions.")
    }
  }

  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current || !scanningRef.current) return

    try {
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")
      if (!context || !videoRef.current.videoWidth) {
        if (scanningRef.current) requestAnimationFrame(scanQRCode)
        return
      }

      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      context.drawImage(videoRef.current, 0, 0)

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const code = window.jsQR(imageData.data, canvas.width, canvas.height)

      if (code && !scanLoading) {
        context.strokeStyle = "#00ff00"
        context.lineWidth = 4
        context.strokeRect(
          code.location.topLeftCorner.x,
          code.location.topLeftCorner.y,
          code.location.bottomRightCorner.x - code.location.topLeftCorner.x,
          code.location.bottomRightCorner.y - code.location.topLeftCorner.y
        )

        scanningRef.current = false
        await processScannedTicket(code.data)

        setTimeout(() => {
          scanningRef.current = true
          scanQRCode()
        }, 2000)
        return
      }
    } catch (error) {
      console.log(error)
    }

    if (scanningRef.current) requestAnimationFrame(scanQRCode)
  }

  const processScannedTicket = async (scannedCode: string) => {
    setScanLoading(true)
    try {
      const qrParts = scannedCode.trim().split("-")
      if (qrParts.length < 3 || qrParts[0] !== "EVENT") {
        setScanResult({ status: "invalid", message: "Invalid QR Code" })
        return
      }

      const scannedEventId = qrParts[1]
      const scannedUserId = qrParts[2]

      const { data: event } = await supabase.from("events").select("*").eq("id", scannedEventId).single()
      if (!event) return setScanResult({ status: "entry", message: "Ticket Confirmed" })

      const { data: ticket } = await supabase
        .from("tickets")
        .select("*")
        .eq("event_id", scannedEventId)
        .eq("user_id", scannedUserId)
        .maybeSingle()

      if (!ticket) return setScanResult({ status: "invalid", message: "Invalid Ticket" })

      const { data: lastEntry } = await supabase
        .from("ticket_entries")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("entry_time", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastEntry && !lastEntry.exit_time) {
        await supabase.from("ticket_entries").update({ exit_time: new Date().toISOString() }).eq("id", lastEntry.id)
      } else {
        await supabase.from("ticket_entries").insert({ ticket_id: ticket.id, entry_time: new Date().toISOString() })
      }

      setScanResult({ status: "entry", message: "Ticket Confirmed", time: new Date().toLocaleTimeString() })
      setTimeout(() => setScanResult(null), 2000)
    } catch (error) {
      console.error(error)
      setScanResult({ status: "error", message: "Error processing QR code" })
    } finally {
      setScanLoading(false)
    }
  }

  const closeScanner = () => {
    scanningRef.current = false
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
    }
    setShowScanner(false)
    setScanResult(null)
  }

  const shareTicket = async (ticket: Ticket) => {
    if (!navigator.share) return alert("Share not supported on this browser")
    try {
      await navigator.share({
        title: `Ticket: ${ticket.event.title}`,
        text: `My Ticket Code: ${ticket.ticket_code}`,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const TicketCard = ({ ticket, showQR = false }: { ticket: Ticket; showQR?: boolean }) => {
    const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig] || statusConfig.valid
    const StatusIcon = statusInfo.icon

    return (
      <Card
        id={showQR ? `ticket-${ticket.id}` : undefined}
        className={`overflow-hidden ${showQR ? "max-w-md mx-auto" : ""} ${selectedTicket?.id === ticket.id ? "ring-2 ring-indigo-500" : ""}`}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="bg-white/20 text-white">{ticket.event.category}</Badge>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
              <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
            </div>
          </div>
          <h3 className="font-semibold text-lg mb-1">{ticket.event.title}</h3>
          <p className="text-indigo-100 text-sm">Ticket #{ticket.ticket_code.substring(0, 12)}</p>
        </div>

        <CardContent className="p-4">
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{new Date(ticket.event.date_time).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{ticket.event.location}</span>
            </div>
            {ticket.event.description && (
              <div className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-500 mt-0.5" />
                <span className="line-clamp-2">{ticket.event.description}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {!showQR && (
              <Button size="sm" className="flex-1" onClick={() => setSelectedTicket(ticket)}>
                <QrCode className="w-4 h-4 mr-2" />
                View QR
              </Button>
            )}
          </div>

          {showQR && (
            <div className="text-center mb-4">
              <div
                id={`qr-wrapper-${ticket.id}`}
                style={{
                  background: "white",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "2px solid #e5e7eb",
                  display: "inline-block"
                }}
              >
                <QRCodeCanvas value={ticket.ticket_code} size={200} level="H" includeMargin={true} />
              </div>

              <p className="text-xs text-gray-500 mt-2">Show this QR code at the event entrance</p>
              <p className="text-xs text-gray-400 mt-1">Code: {ticket.ticket_code}</p>

              
              <div className="mt-4">
                <Button size="sm" className="flex-1" onClick={() => shareTicket(ticket)}>
                  <Share className="w-4 h-4 mr-2" />
                  Share Ticket
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )

  const validTickets = tickets.filter((t) => t.status === "valid")
  const usedTickets = tickets.filter((t) => t.status === "used")

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Scan Event QR Code</CardTitle>
              <Button variant="ghost" size="sm" onClick={closeScanner}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!scanResult ? (
                <>
                  <div className="relative bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} className="w-full aspect-square object-cover" autoPlay playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-2 border-green-500 opacity-30"></div>
                  </div>
                  <Button onClick={startCameraStream} className="w-full" disabled={scanLoading}>
                    {scanLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4 mr-2" />
                    )}
                    Start Camera
                  </Button>
                </>
              ) : (
                <div className={`p-4 rounded-lg text-center ${scanResult.status === "entry" ? "bg-green-100" : scanResult.status === "exit" ? "bg-blue-100" : "bg-red-100"}`}>
                  <p className={`font-semibold text-lg ${scanResult.status === "entry" ? "text-green-700" : scanResult.status === "exit" ? "text-blue-700" : "text-red-700"}`}>
                    {scanResult.message}
                  </p>
                  <p className="text-sm mt-2">{scanResult.time}</p>
                  <Button onClick={closeScanner} className="w-full mt-4">Close</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">My Tickets</h1>
          </div>
          <div className="flex items-center gap-3">
            {userRole === "scanner" && (
              <Button onClick={() => { setShowScanner(true); startCameraStream() }} size="sm" className="gap-2">
                <Camera className="w-4 h-4" /> Scan QR
              </Button>
            )}
            <Badge variant="outline">{tickets.length} ticket{tickets.length !== 1 ? "s" : ""}</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedTicket ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tickets
              </Button>
              <h2 className="text-2xl font-bold text-gray-900">Event Ticket</h2>
            </div>
            <TicketCard ticket={selectedTicket} showQR={true} />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="my-tickets">All Tickets ({tickets.length})</TabsTrigger>
              <TabsTrigger value="valid">Valid ({validTickets.length})</TabsTrigger>
              <TabsTrigger value="used">Used ({usedTickets.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="my-tickets">
              {tickets.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{tickets.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
              ) : (
                <div className="text-center py-12"><QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" /><h3>No tickets yet</h3></div>
              )}
            </TabsContent>
            <TabsContent value="valid">
              {validTickets.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{validTickets.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
              ) : (
                <div className="text-center py-12">No valid tickets</div>
              )}
            </TabsContent>
            <TabsContent value="used">
              {usedTickets.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{usedTickets.map(t => <TicketCard key={t.id} ticket={t} />)}</div>
              ) : (
                <div className="text-center py-12">No used tickets</div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
