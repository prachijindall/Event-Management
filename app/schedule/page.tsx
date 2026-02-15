"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  Search,
  ArrowLeft,
  Share2,
  Heart,
  SlidersHorizontal,
  Download,
  Bell,
  Bookmark,
  X,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import toast, { Toaster } from "react-hot-toast"

interface Event {
  id: string
  title: string
  description: string
  date_time: string
  location: string
  category: string
  image_url: string
  max_attendees: number
  current_attendees: number
  created_at: string
  speaker_name?: string
  speaker_bio?: string
  speaker_image?: string
}

const categories = ["All", "Tech", "Career", "Cultural", "Dance", "Business", "Workshop", "Sports", "Music"]
const dateFilterOptions = ["All", "Upcoming", "This Week", "This Month", "Happening Today"]
const sortOptions = ["Recent", "Popular", "Date", "Capacity"]

export default function SchedulePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedDate, setSelectedDate] = useState("All")
  const [sortBy, setSortBy] = useState("Recent")
  const [viewMode, setViewMode] = useState("grid")
  const [showFilters, setShowFilters] = useState(false)
  const [quickFilter, setQuickFilter] = useState<"all" | "registered" | "favorites" | "bookmarks">("all")
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [registrations, setRegistrations] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)

      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .order("date_time", { ascending: true })
      if (eventsError) console.error(eventsError)
      if (eventsData) setAllEvents(eventsData)

      const { data: registrationsData } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user.id)
      if (registrationsData) setRegistrations(registrationsData.map((r) => r.event_id))

      const { data: favoritesData } = await supabase
        .from("favorites")
        .select("event_id")
        .eq("user_id", user.id)
      if (favoritesData) setFavorites(favoritesData.map((f) => f.event_id))

      setLoading(false)
    }

    fetchData()
  }, [])

  const filteredEvents = useMemo(() => {
    const now = new Date()
    const todayDate = now.toISOString().split("T")[0]
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    let filtered = allEvents.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategory === "All" || event.category === selectedCategory

      let matchesDate = true
      const eventDate = new Date(event.date_time)
      const eventDateOnly = event.date_time.split("T")[0]

      if (selectedDate === "Upcoming") matchesDate = eventDate > now
      else if (selectedDate === "Happening Today") matchesDate = eventDateOnly === todayDate
      else if (selectedDate === "This Week") matchesDate = eventDate > now && eventDate <= weekFromNow
      else if (selectedDate === "This Month") matchesDate = eventDate > now && eventDate <= monthFromNow

      // Quick filter
      let matchesQuickFilter = true
      if (quickFilter === "registered") matchesQuickFilter = registrations.includes(event.id)
      else if (quickFilter === "favorites") matchesQuickFilter = favorites.includes(event.id)
      else if (quickFilter === "bookmarks") matchesQuickFilter = bookmarks.includes(event.id)

      return matchesSearch && matchesCategory && matchesDate && matchesQuickFilter
    })

    // Sorting
    if (sortBy === "Recent") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (sortBy === "Popular") {
      filtered.sort((a, b) => b.current_attendees - a.current_attendees)
    } else if (sortBy === "Date") {
      filtered.sort((a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime())
    } else if (sortBy === "Capacity") {
      filtered.sort((a, b) => (b.max_attendees - b.current_attendees) - (a.max_attendees - a.current_attendees))
    }

    return filtered
  }, [allEvents, searchTerm, selectedCategory, selectedDate, sortBy, quickFilter, registrations, favorites, bookmarks])

  const registerForEvent = async (eventId: string) => {
    if (!user) return
    const event = allEvents.find((e) => e.id === eventId)
    if (!event) return
    const isRegistered = registrations.includes(eventId)

    if (isRegistered) {
      const { error: deleteError } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id)
      if (deleteError) return toast.error("Unregister failed")

      const newCount = Math.max(0, event.current_attendees - 1)
      const { error: updateError } = await supabase
        .from("events")
        .update({ current_attendees: newCount })
        .eq("id", eventId)
      if (updateError) return toast.error("Failed to update attendee count")

      setRegistrations((prev) => prev.filter((id) => id !== eventId))
      setAllEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, current_attendees: newCount } : e))
      )
      toast.success("Unregistered successfully")
    } else {
      if (event.current_attendees >= event.max_attendees) return toast.error("Event is full")
      const { data: inserted, error: insertError } = await supabase
        .from("event_registrations")
        .insert({ event_id: eventId, user_id: user.id, registered_at: new Date().toISOString() })
        .select("*")
      if (insertError) return toast.error("Registration failed")

      const newCount = event.current_attendees + 1
      const { error: updateError } = await supabase
        .from("events")
        .update({ current_attendees: newCount })
        .eq("id", eventId)
      if (updateError) return toast.error("Failed to update attendee count")

      setRegistrations((prev) => [...prev, eventId])
      setAllEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, current_attendees: newCount } : e))
      )
      toast.success("Registration confirmed")
    }
  }

  const toggleFavorite = async (eventId: string) => {
    if (!user) return
    if (favorites.includes(eventId)) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id)
      if (error) return toast.error("Failed to remove favorite")
      setFavorites((prev) => prev.filter((id) => id !== eventId))
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ event_id: eventId, user_id: user.id })
      if (error) return toast.error("Failed to add favorite")
      setFavorites((prev) => [...prev, eventId])
    }
  }

  const toggleBookmark = (eventId: string) => {
    if (bookmarks.includes(eventId)) {
      setBookmarks((prev) => prev.filter((id) => id !== eventId))
      toast.success("Bookmark removed")
    } else {
      setBookmarks((prev) => [...prev, eventId])
      toast.success("Bookmarked")
    }
  }

  const downloadEventDetails = (event: Event) => {
    const details = `EVENT DETAILS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${event.title}\n${event.category}\n\n📅 ${new Date(event.date_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n🕐 ${new Date(event.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}\n📍 ${event.location}\n👥 ${event.current_attendees} / ${event.max_attendees} attendees\n\nDESCRIPTION\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${event.description}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nGenerated on ${new Date().toLocaleString()}`
    const blob = new Blob([details], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Details downloaded")
  }

  const EventDetailsDialog = ({ event }: { event: Event }) => {
    const [open, setOpen] = useState(false)
    const fillPercentage = (event.current_attendees / event.max_attendees) * 100
    const spotsLeft = event.max_attendees - event.current_attendees

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <h4 className="font-serif text-base leading-tight mb-2 cursor-pointer hover:text-[#7dd3c0] transition-colors line-clamp-2">
            {event.title}
          </h4>
        </DialogTrigger>

        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-black border border-white/10 text-white p-0">
          <div className="grid md:grid-cols-[1fr_400px]">
            {/* Left Side - Image & Description */}
            <div className="relative">
              <div className="relative h-[60vh]">
                <img
                  src={event.image_url || "/placeholder.svg?height=800&width=800"}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                
                <button
                  onClick={() => setOpen(false)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-black/80 hover:border-[#7dd3c0]/80 transition-all z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 text-[10px] uppercase tracking-[0.2em] mb-3">
                    {event.category}
                  </span>
                  <h2 className="font-serif text-4xl font-light tracking-tight leading-tight mb-3">
                    {event.title}
                  </h2>
                  {spotsLeft <= 10 && spotsLeft > 0 && (
                    <div className="inline-block px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-300 text-xs">
                      Only {spotsLeft} spots left
                    </div>
                  )}
                </div>
              </div>

              {/* Description Section */}
              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">Description</h3>
                  <p className="text-neutral-300 leading-relaxed">
                    {event.description}
                  </p>
                </div>

                {event.speaker_name && (
                  <div className="pt-6 border-t border-white/10">
                    <h3 className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-3">Featured Speaker</h3>
                    <div className="flex gap-4">
                      {event.speaker_image ? (
                        <img
                          src={event.speaker_image}
                          alt={event.speaker_name}
                          className="w-12 h-12 rounded-full object-cover border border-white/20"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 border border-[#7dd3c0]/50 flex items-center justify-center font-serif text-lg text-[#7dd3c0]">
                          {event.speaker_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-serif text-lg mb-1">{event.speaker_name}</p>
                        {event.speaker_bio && (
                          <p className="text-sm text-neutral-400">{event.speaker_bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-5 gap-2 pt-4">
                  <button
                    disabled={event.current_attendees >= event.max_attendees && !registrations.includes(event.id)}
                    className={`col-span-3 h-12 text-xs uppercase tracking-[0.15em] transition-all ${
                      registrations.includes(event.id)
                        ? "bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white"
                        : event.current_attendees >= event.max_attendees
                        ? "bg-neutral-900 text-neutral-600 border border-white/10 cursor-not-allowed"
                        : "bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white hover:from-[#7dd3c0] hover:to-[#7dd3c0]/80 hover:text-black"
                    }`}
                    onClick={() => registerForEvent(event.id)}
                  >
                    {registrations.includes(event.id) ? "Registered ✓" :
                      event.current_attendees >= event.max_attendees ? "Sold Out" : "Reserve Spot"}
                  </button>

                  <button
                    onClick={() => toggleFavorite(event.id)}
                    className={`h-12 border transition-all flex items-center justify-center ${
                      favorites.includes(event.id) 
                        ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                        : "border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${favorites.includes(event.id) ? "fill-current text-[#7dd3c0]" : ""}`} />
                  </button>

                  <button
                    onClick={() => toggleBookmark(event.id)}
                    className={`h-12 border transition-all flex items-center justify-center ${
                      bookmarks.includes(event.id) 
                        ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                        : "border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${bookmarks.includes(event.id) ? "fill-current text-[#7dd3c0]" : ""}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => downloadEventDetails(event)}
                    className="h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>

                  <button
                    className="h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2"
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: event.title, text: event.description, url: window.location.href })
                      } else { 
                        navigator.clipboard.writeText(window.location.href)
                        toast.success("Link copied") 
                      }
                    }}
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side - Event Details */}
            <div className="bg-black/40 border-l border-white/10 p-8 space-y-6">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-neutral-500 text-[10px] uppercase tracking-[0.15em] mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>Date</span>
                  </div>
                  <p className="text-sm text-neutral-300">
                    {new Date(event.date_time).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <div className="flex items-center gap-2 text-neutral-500 text-[10px] uppercase tracking-[0.15em] mb-2">
                    <Clock className="w-3 h-3" />
                    <span>Time</span>
                  </div>
                  <p className="text-sm text-neutral-300">
                    {new Date(event.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <div className="flex items-center gap-2 text-neutral-500 text-[10px] uppercase tracking-[0.15em] mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>Venue</span>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-300">{event.location}</p>
                </div>

                <div className="h-px bg-white/10" />

                <div>
                  <div className="flex items-center gap-2 text-neutral-500 text-[10px] uppercase tracking-[0.15em] mb-2">
                    <Users className="w-3 h-3" />
                    <span>Attendance</span>
                  </div>
                  <p className="text-sm mb-3 text-neutral-300">{event.current_attendees} / {event.max_attendees}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-neutral-400">
                      <span>Capacity</span>
                      <span>{fillPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-[#7dd3c0] transition-all duration-500"
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all text-xs uppercase tracking-[0.15em] flex items-center justify-center gap-2">
                <Bell className="w-3 h-3" />
                Set Reminder
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border border-white/10 border-t-[#7dd3c0] rounded-full animate-spin mx-auto" />
          <p className="text-neutral-500 text-xs uppercase tracking-[0.2em]">Curating Experiences</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          },
        }}
      />

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10">
        <div className="max-w-[1800px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/">
                <button className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h1 className="font-serif text-2xl font-light tracking-tight">Event Gallery</h1>
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em] mt-0.5">
                  {filteredEvents.length} Curated Experiences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${
                  showFilters 
                    ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                    : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                Filters
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                onClick={() => setViewMode("grid")}
                className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all ${
                  viewMode === "grid" 
                    ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                    : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all ${
                  viewMode === "list" 
                    ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                    : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-[1800px] mx-auto px-8 pb-16">
        {/* Advanced Filters */}
        {showFilters && (
          <div className="mb-12 p-8 border border-white/10 bg-white/[0.02] space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-500">Advanced Filters</h3>
              <button
                onClick={() => {
                  setSearchTerm("")
                  setSelectedCategory("All")
                  setSelectedDate("All")
                  setSortBy("Recent")
                  setQuickFilter("all")
                }}
                className="text-xs text-neutral-400 hover:text-[#7dd3c0] transition-colors uppercase tracking-wider"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-2">
                <label className="block text-[9px] uppercase tracking-[0.15em] text-neutral-500 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Event title, description, location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-white/10 h-10 pl-10 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#7dd3c0] transition-all text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.15em] text-neutral-500 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-neutral-900/50 border border-white/10 h-10 px-3 text-white text-xs focus:outline-none focus:border-[#7dd3c0] transition-all cursor-pointer"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.15em] text-neutral-500 mb-2">Timeframe</label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full appearance-none bg-neutral-900/50 border border-white/10 h-10 px-3 text-white text-xs focus:outline-none focus:border-[#7dd3c0] transition-all cursor-pointer"
                >
                  {dateFilterOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="col-span-4">
                <label className="block text-[9px] uppercase tracking-[0.15em] text-neutral-500 mb-2">Sort By</label>
                <div className="flex gap-2">
                  {sortOptions.map(option => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`px-4 h-9 text-[10px] uppercase tracking-[0.15em] transition-all ${
                        sortBy === option 
                          ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                          : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-500 mb-3">Quick Access</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setQuickFilter(quickFilter === "all" ? "all" : "all")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all ${
                    quickFilter === "all" 
                      ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                      : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                  }`}
                >
                  All Events
                </button>
                <button
                  onClick={() => setQuickFilter(quickFilter === "registered" ? "all" : "registered")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all ${
                    quickFilter === "registered" 
                      ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                      : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                  }`}
                >
                  My Registrations ({registrations.length})
                </button>
                <button
                  onClick={() => setQuickFilter(quickFilter === "favorites" ? "all" : "favorites")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all ${
                    quickFilter === "favorites" 
                      ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                      : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                  }`}
                >
                  Favorites ({favorites.length})
                </button>
                <button
                  onClick={() => setQuickFilter(quickFilter === "bookmarks" ? "all" : "bookmarks")}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all ${
                    quickFilter === "bookmarks" 
                      ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white" 
                      : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                  }`}
                >
                  Bookmarked ({bookmarks.length})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Events Display */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-4 gap-6">
            {filteredEvents.map((event) => {
              const fillPercentage = (event.current_attendees / event.max_attendees) * 100
              const spotsLeft = event.max_attendees - event.current_attendees

              return (
                <div key={event.id} className="group">
                  {/* Square Image Container */}
                  <div className="relative aspect-square overflow-hidden bg-neutral-900 mb-3 border border-white/10 hover:border-[#7dd3c0]/80 transition-all">
                    <img
                      src={event.image_url || "/placeholder.svg?height=600&width=600"}
                      alt={event.title}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-black/60 backdrop-blur-sm border border-white/20 text-[9px] uppercase tracking-[0.15em]">
                        {event.category}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(event.id)
                        }}
                        className={`w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border flex items-center justify-center transition-all ${
                          favorites.includes(event.id) 
                            ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                            : "border-white/10 hover:bg-black/80 hover:border-[#7dd3c0]/80"
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${favorites.includes(event.id) ? "text-[#7dd3c0] fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleBookmark(event.id)
                        }}
                        className={`w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border flex items-center justify-center transition-all ${
                          bookmarks.includes(event.id) 
                            ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                            : "border-white/10 hover:bg-black/80 hover:border-[#7dd3c0]/80"
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${bookmarks.includes(event.id) ? "fill-current text-[#7dd3c0]" : ""}`} />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      {spotsLeft <= 10 && spotsLeft > 0 && (
                        <div className="mb-2 px-2 py-1 bg-red-500/20 border border-red-500/30 text-red-300 text-[9px] uppercase tracking-wider text-center">
                          {spotsLeft} spots left
                        </div>
                      )}
                      {registrations.includes(event.id) && (
                        <div className="mb-2 px-2 py-1 bg-[#7dd3c0]/20 backdrop-blur-sm border border-[#7dd3c0]/30 text-[#7dd3c0] text-[9px] uppercase tracking-wider text-center">
                          Registered
                        </div>
                      )}
                      <div className="flex items-center justify-between text-white text-[9px] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="uppercase tracking-wider">{event.current_attendees}/{event.max_attendees}</span>
                        <span className="uppercase tracking-wider">{fillPercentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-0.5 bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-[#7dd3c0] transition-all duration-500"
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <EventDetailsDialog event={event} />
                    
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                      {event.description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-[9px] text-neutral-500 uppercase tracking-wider">
                      <span>{new Date(event.date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>•</span>
                      <span className="line-clamp-1">{event.location}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        registerForEvent(event.id)
                      }}
                      disabled={event.current_attendees >= event.max_attendees && !registrations.includes(event.id)}
                      className={`w-full h-10 text-[10px] uppercase tracking-[0.15em] transition-all ${
                        registrations.includes(event.id)
                          ? "bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white"
                          : event.current_attendees >= event.max_attendees
                          ? "bg-neutral-900 text-neutral-600 border border-white/10 cursor-not-allowed"
                          : "border border-white/10 text-white hover:bg-gradient-to-r hover:from-[#7dd3c0]/20 hover:to-[#7dd3c0]/10 hover:border-[#7dd3c0] hover:text-white"
                      }`}
                    >
                      {registrations.includes(event.id) ? "Registered" :
                        event.current_attendees >= event.max_attendees ? "Sold Out" : "Reserve"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              const fillPercentage = (event.current_attendees / event.max_attendees) * 100
              
              return (
                <div key={event.id} className="group flex gap-6 border-b border-white/10 pb-6 hover:border-[#7dd3c0]/80 transition-all">
                  <div className="relative w-64 aspect-[16/10] flex-shrink-0 overflow-hidden bg-neutral-900 border border-white/10">
                    <img
                      src={event.image_url || "/placeholder.svg?height=300&width=500"}
                      alt={event.title}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-[9px] uppercase tracking-wider">
                        {event.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <EventDetailsDialog event={event} />
                      <p className="text-neutral-400 text-sm leading-relaxed mb-4 line-clamp-2">
                        {event.description}
                      </p>
                      
                      <div className="grid grid-cols-4 gap-4 text-[9px] text-neutral-500 uppercase tracking-wider">
                        <div>
                          <span className="block text-neutral-600 mb-1">Date</span>
                          <span className="text-neutral-400">{new Date(event.date_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <span className="block text-neutral-600 mb-1">Time</span>
                          <span className="text-neutral-400">{new Date(event.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div>
                          <span className="block text-neutral-600 mb-1">Location</span>
                          <span className="line-clamp-1 text-neutral-400">{event.location}</span>
                        </div>
                        <div>
                          <span className="block text-neutral-600 mb-1">Capacity</span>
                          <span className="text-neutral-400">{event.current_attendees}/{event.max_attendees} ({fillPercentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-4">
                      <button
                        onClick={() => registerForEvent(event.id)}
                        disabled={event.current_attendees >= event.max_attendees && !registrations.includes(event.id)}
                        className={`px-6 h-9 text-[10px] uppercase tracking-[0.15em] transition-all ${
                          registrations.includes(event.id)
                            ? "bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white"
                            : event.current_attendees >= event.max_attendees
                            ? "bg-neutral-900 text-neutral-600 border border-white/10 cursor-not-allowed"
                            : "border border-white/10 hover:bg-gradient-to-r hover:from-[#7dd3c0]/20 hover:to-[#7dd3c0]/10 hover:border-[#7dd3c0] hover:text-white"
                        }`}
                      >
                        {registrations.includes(event.id) ? "Registered" :
                          event.current_attendees >= event.max_attendees ? "Sold Out" : "Reserve"}
                      </button>
                      
                      <button
                        onClick={() => toggleFavorite(event.id)}
                        className={`w-9 h-9 border transition-all flex items-center justify-center ${
                          favorites.includes(event.id) 
                            ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                            : "border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${favorites.includes(event.id) ? "fill-current text-[#7dd3c0]" : ""}`} />
                      </button>

                      <button
                        onClick={() => toggleBookmark(event.id)}
                        className={`w-9 h-9 border transition-all flex items-center justify-center ${
                          bookmarks.includes(event.id) 
                            ? "border-[#7dd3c0] bg-[#7dd3c0]/10" 
                            : "border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80"
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${bookmarks.includes(event.id) ? "fill-current text-[#7dd3c0]" : ""}`} />
                      </button>

                      <button
                        onClick={() => downloadEventDetails(event)}
                        className="w-9 h-9 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all flex items-center justify-center"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {filteredEvents.length === 0 && (
          <div className="text-center py-32 border border-white/10">
            <div className="w-16 h-16 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-6 h-6 text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-xs uppercase tracking-[0.2em] mb-2">No Events Found</p>
            <p className="text-neutral-600 text-xs">Adjust your filters to discover more</p>
            <button
              onClick={() => {
                setSearchTerm("")
                setSelectedCategory("All")
                setSelectedDate("All")
                setQuickFilter("all")
              }}
              className="mt-6 px-6 h-10 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 text-[10px] uppercase tracking-[0.15em] transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  )
}