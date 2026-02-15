"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, CheckCircle, XCircle, LogIn, LogOut, Camera } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"

interface ScanResult {
  ticketCode: string
  eventTitle: string
  eventId: string
  userName: string
  userEmail: string
  ticketStatus: "valid" | "invalid"
  entryStatus: "entered" | "exited" | "error"
  message: string
  timestamp: Date
}

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [scanning, setScanning] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [flashClass, setFlashClass] = useState("")
  
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user: current } } = await supabase.auth.getUser()

      if (!current) {
        setErrorMessage("Please log in first")
        setAuthChecked(true)
        return
      }

      setUser(current)
      setUserEmail(current.email || "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", current.id)
        .single()

      setProfileRole(profile?.role || null)
      setAuthChecked(true)

      if (profile?.role?.toLowerCase() !== "admin" && profile?.role?.toLowerCase() !== "scanner") {
        setErrorMessage("Access denied. Admin or Scanner role required.")
      }
    }

    init()
  }, [])

  const startScanning = async () => {
    if (profileRole?.toLowerCase() !== "admin" && profileRole?.toLowerCase() !== "scanner") {
      setErrorMessage("Not authorized to scan")
      return
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setStream(mediaStream)
        setScanning(true)
        
        // Start scanning after video is ready
        setTimeout(() => {
          requestAnimationFrame(scanQRCode)
        }, 1000)
      }
    } catch (error) {
      console.error("Camera error:", error)
      toast.error("Failed to access camera. Please allow camera permissions.")
    }
  }

  const stopScanning = () => {
    setScanning(false)
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const scanQRCode = async () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      
      if (ctx && canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Check for BarcodeDetector API
        if ('BarcodeDetector' in window) {
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({ formats: ["qr_code"] })
            const barcodes = await barcodeDetector.detect(canvas)
            
            if (barcodes.length > 0 && !loading) {
              await processQRCode(barcodes[0].rawValue)
            }
          } catch (error) {
            console.error("Barcode detection error:", error)
          }
        }
      }
    }
    
    if (scanning) {
      requestAnimationFrame(scanQRCode)
    }
  }

  const beepSuccess = () => {
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.connect(g)
      g.connect(ac.destination)
      osc.frequency.value = 900
      g.gain.setValueAtTime(0.3, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.15)
      osc.start()
      osc.stop(ac.currentTime + 0.15)
    } catch (error) {
      console.error("Audio error:", error)
    }
  }

  const beepError = () => {
    try {
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.connect(g)
      g.connect(ac.destination)
      osc.frequency.value = 300
      g.gain.setValueAtTime(0.4, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.2)
      osc.start()
      osc.stop(ac.currentTime + 0.2)
    } catch (error) {
      console.error("Audio error:", error)
    }
  }

  const flash = (type: string) => {
    setFlashClass(type === "entered" ? "bg-[#7dd3c0]/30" : type === "exited" ? "bg-blue-500/30" : "bg-red-500/30")
    setTimeout(() => setFlashClass(""), 800)
  }

  const processQRCode = async (raw: string) => {
    setLoading(true)
    const trimmed = raw.trim()

    // Extract event_id and user_id from format: EVENT-{event_id}-{user_id}
    const match = trimmed.match(/^EVENT-([0-9a-fA-F-]{36})-([0-9a-fA-F-]{36})/)
    
    if (!match) {
      flash("error")
      beepError()
      setLastScan({
        ticketCode: trimmed,
        eventTitle: "Unknown",
        eventId: "",
        userName: "Unknown",
        userEmail: "N/A",
        ticketStatus: "invalid",
        entryStatus: "error",
        message: "Invalid QR format",
        timestamp: new Date(),
      })
      toast.error("Invalid QR Code")
      setTimeout(() => setLastScan(null), 3500)
      setLoading(false)
      return
    }

    const eventId = match[1]
    const userId = match[2]

    // Check if ticket exists and is valid
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*, events(title)")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("status", "valid")
      .maybeSingle()

    if (ticketError || !ticket) {
      flash("error")
      beepError()
      setLastScan({
        ticketCode: trimmed,
        eventTitle: "Unknown",
        eventId,
        userName: "Unknown",
        userEmail: "N/A",
        ticketStatus: "invalid",
        entryStatus: "error",
        message: "Invalid or Used Ticket",
        timestamp: new Date(),
      })
      toast.error("Invalid Ticket")
      setTimeout(() => setLastScan(null), 3500)
      setLoading(false)
      return
    }

    // Check last entry
    const { data: lastEntry } = await supabase
      .from("ticket_entries")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("entry_time", { ascending: false })
      .limit(1)
      .maybeSingle()

    let entryStatus: "entered" | "exited" = "entered"
    let message = "Entry Confirmed"

    if (lastEntry && !lastEntry.exit_time) {
      // Person is inside, mark exit
      await supabase
        .from("ticket_entries")
        .update({ exit_time: new Date().toISOString() })
        .eq("id", lastEntry.id)
      
      entryStatus = "exited"
      message = "Exit Confirmed"
      flash("exited")
    } else {
      // Person is entering
      await supabase
        .from("ticket_entries")
        .insert({ ticket_id: ticket.id, entry_time: new Date().toISOString() })
      
      flash("entered")
    }

    beepSuccess()
    setLastScan({
      ticketCode: trimmed,
      eventTitle: ticket.events?.title || "Event",
      eventId: ticket.event_id,
      userName: "Attendee",
      userEmail: "N/A",
      ticketStatus: "valid",
      entryStatus,
      message,
      timestamp: new Date(),
    })
    toast.success(message)
    setTimeout(() => setLastScan(null), 3500)
    setLoading(false)
  }

  useEffect(() => {
    return () => {
      stopScanning()
    }
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}} />

      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/tickets">
                <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h1 className="font-serif text-2xl font-light tracking-tight">Ticket Scanner</h1>
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em] mt-0.5">Gate Control</p>
              </div>
            </div>

            {userEmail && (
              <div className="text-xs text-neutral-400 uppercase tracking-[0.15em]">
                <span className="text-neutral-600">Scanner: </span>
                <span className="text-white">{userEmail}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-7xl mx-auto px-8 pb-16">
        <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
          {/* Camera Section */}
          <div className="space-y-4">
            <div className={`relative overflow-hidden border border-white/10 bg-black transition-all duration-300 ${flashClass}`}>
              {!authChecked || errorMessage ? (
                <div className="aspect-video flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 border border-red-500/50 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-red-400 text-sm">{errorMessage}</p>
                  </div>
                </div>
              ) : !scanning ? (
                <div className="aspect-video flex items-center justify-center bg-neutral-900">
                  <div className="text-center space-y-4">
                    <Camera className="w-16 h-16 text-neutral-600 mx-auto" />
                    <p className="text-neutral-500 text-sm">Camera ready to scan</p>
                    <button
                      onClick={startScanning}
                      className="h-12 px-8 bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white hover:from-[#7dd3c0] hover:to-[#7dd3c0]/80 hover:text-black transition-all text-[10px] uppercase tracking-[0.15em] flex items-center gap-2 mx-auto"
                    >
                      <Camera className="w-4 h-4" />
                      Start Camera
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-video bg-black">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Scanning Frame Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-72 h-72">
                      {/* Scanning box */}
                      <div className="absolute inset-0 border-2 border-[#7dd3c0] rounded-lg animate-pulse"></div>
                      
                      {/* Corner accents */}
                      <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-[#7dd3c0] rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-[#7dd3c0] rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-[#7dd3c0] rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-[#7dd3c0] rounded-br-lg"></div>
                      
                      {/* Center crosshair */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8">
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#7dd3c0] -translate-y-1/2"></div>
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#7dd3c0] -translate-x-1/2"></div>
                      </div>
                    </div>
                  </div>

                  {/* Status Text */}
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <div className="bg-black/80 backdrop-blur-sm px-6 py-3 rounded-lg border border-white/10">
                      <p className="text-white text-sm font-medium">
                        {loading ? "🔄 Processing..." : "📱 Point camera at QR code"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {scanning && (
              <button
                onClick={stopScanning}
                className="w-full h-10 border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all text-[10px] uppercase tracking-[0.15em]"
              >
                Stop Scanner
              </button>
            )}
          </div>

          {/* Last Scan Card */}
          <Card className="border border-white/10 bg-white/[0.02] h-fit sticky top-24">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-lg font-serif font-light text-white">Last Scan</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {lastScan ? (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={`${lastScan.ticketStatus === "valid" ? "bg-[#7dd3c0]/20 border-[#7dd3c0] text-[#7dd3c0]" : "bg-red-500/20 border-red-500 text-red-400"} text-[10px] uppercase tracking-[0.15em]`}>
                      {lastScan.ticketStatus}
                    </Badge>
                    <Badge className={`${
                      lastScan.entryStatus === "entered" ? "bg-[#7dd3c0]/20 border-[#7dd3c0] text-[#7dd3c0]" :
                      lastScan.entryStatus === "exited" ? "bg-blue-500/20 border-blue-500 text-blue-400" :
                      "bg-red-500/20 border-red-500 text-red-400"
                    } text-[10px] uppercase tracking-[0.15em] flex items-center gap-1`}>
                      {lastScan.entryStatus === "entered" ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                      {lastScan.entryStatus}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="font-serif text-lg text-white">{lastScan.eventTitle}</p>
                    <p className="text-sm text-neutral-300">{lastScan.userName}</p>
                    <p className="text-xs text-neutral-500 font-mono bg-white/5 p-2 rounded border border-white/10 break-all">
                      {lastScan.ticketCode}
                    </p>
                    <p className="text-xs text-neutral-400">{lastScan.timestamp.toLocaleTimeString()}</p>
                  </div>

                  <div className={`p-3 rounded border ${lastScan.ticketStatus === "valid" ? "border-[#7dd3c0]/50 bg-[#7dd3c0]/10 text-[#7dd3c0]" : "border-red-500/50 bg-red-500/10 text-red-400"}`}>
                    <p className="text-sm font-medium">{lastScan.message}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-neutral-600" />
                  </div>
                  <p className="text-neutral-500 text-xs">No scans yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}