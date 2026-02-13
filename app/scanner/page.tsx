
"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

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
      const {
        data: { user: current },
      } = await supabase.auth.getUser()

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

      if (profile?.role?.toLowerCase() !== "scanner") {
        setErrorMessage("Access denied. Scanner role required.")
      }
    }

    init()
  }, [])

  const startScanning = async () => {
    if (profileRole?.toLowerCase() !== "scanner") {
      setErrorMessage("Not authorized to scan")
      return
    }

    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    })

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream
      setStream(mediaStream)
      setScanning(true)
      requestAnimationFrame(scanQRCode)
    }
  }

  const stopScanning = () => {
    setScanning(false)
    stream?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  const scanQRCode = async () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const BD = (window as any).BarcodeDetector
        if (BD) {
          const detector = new BD({ formats: ["qr_code"] })
          const codes = await detector.detect(canvas)
          if (codes.length > 0 && !loading) {
            processQRCode(codes[0].rawValue)
          }
        }
      }
    }
    requestAnimationFrame(scanQRCode)
  }

  const beepSuccess = () => {
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
  }

  const beepError = () => {
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
  }

  const flash = (type: string) => {
    setFlashClass(type === "entered" ? "bg-green-200" : type === "exited" ? "bg-blue-200" : "bg-red-200")
    setTimeout(() => setFlashClass(""), 600)
  }
const processQRCode = async (raw: string) => {
  setLoading(true);
  const trimmed = raw.trim();
  console.log("[SCAN] Raw QR:", trimmed);

  // Extract only UUID part
  const match = trimmed.match(/^EVENT-([0-9a-fA-F-]{36})/);
  const eventId = match ? match[1] : null;

  if (!eventId) {
    flash("error");
    beepError();
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
    });
    setTimeout(() => setLastScan(null), 3500);
    setLoading(false);
    return;
  }

  console.log("[SCAN] Extracted Event ID:", eventId);

  // Query Supabase
  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) {
    flash("error");
    beepError();
    setLastScan({
      ticketCode: trimmed,
      eventTitle: "Unknown",
      eventId,
      userName: "Unknown",
      userEmail: "N/A",
      ticketStatus: "invalid",
      entryStatus: "error",
      message: "Ticket not found",
      timestamp: new Date(),
    });
    setTimeout(() => setLastScan(null), 3500);
    setLoading(false);
    return;
  }

  // Ticket valid
  flash("entered");
  beepSuccess();
  setLastScan({
    ticketCode: trimmed,
    eventTitle: event.title,
    eventId: event.id,
    userName: "Event Holder",
    userEmail: "N/A",
    ticketStatus: "valid",
    entryStatus: "entered",
    message: "Ticket Confirmed",
    timestamp: new Date(),
  });
  setTimeout(() => setLastScan(null), 3500);
  setLoading(false);
};


  useEffect(() => () => stopScanning(), [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <header className="bg-white/70 backdrop-blur border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-3 h-16">
          <Link href="/">
            <Button variant="ghost">← Back</Button>
          </Link>
          <h1 className="text-xl font-bold">Ticket Gate Scanner</h1>

          {userEmail && (
            <div className="ml-auto text-sm text-gray-600">
              Scanner: <span className="font-semibold">{userEmail}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <Card className={`overflow-hidden transition-colors ${flashClass}`}>
            <CardContent className="p-0">
              {!authChecked || errorMessage ? (
                <div className="p-6 text-center text-red-600">{errorMessage}</div>
              ) : !scanning ? (
                <div className="bg-gray-900 aspect-video flex flex-col items-center justify-center">
                  <Button size="lg" className="bg-indigo-600" onClick={startScanning}>
                    📷 Start Scanner
                  </Button>
                </div>
              ) : (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full aspect-video object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
            </CardContent>
          </Card>

          {scanning && (
            <Button variant="destructive" className="w-full" onClick={stopScanning}>
              Stop Scanner
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Last Scan</CardTitle>
          </CardHeader>
          <CardContent>
            {lastScan ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Badge className={lastScan.ticketStatus === "valid" ? "bg-green-600" : "bg-red-600"}>
                    {lastScan.ticketStatus.toUpperCase()}
                  </Badge>
                  <Badge
                    className={
                      lastScan.entryStatus === "entered"
                        ? "bg-green-600"
                        : lastScan.entryStatus === "exited"
                          ? "bg-blue-600"
                          : "bg-red-600"
                    }
                  >
                    {lastScan.entryStatus.toUpperCase()}
                  </Badge>
                </div>

                <p className="font-semibold">{lastScan.eventTitle}</p>
                <p>{lastScan.userName}</p>
                <p className="text-xs">{lastScan.userEmail}</p>
                <p className="font-mono text-xs bg-gray-100 p-1 rounded">{lastScan.ticketCode}</p>
                <p className="text-xs">{lastScan.timestamp.toLocaleTimeString()}</p>
                <p className={lastScan.ticketStatus === "valid" ? "text-green-600" : "text-red-600"}>
                  {lastScan.message}
                </p>
              </div>
            ) : (
              <p className="text-center py-8 text-gray-600">No scans yet</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
