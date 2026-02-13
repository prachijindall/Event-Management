

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
const dateFilterOptions = ["All", "Upcoming", "Happening Today"]

export default function SchedulePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedDate, setSelectedDate] = useState("All")
  const [viewMode, setViewMode] = useState("grid")
  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [registrations, setRegistrations] = useState<string[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
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

    return allEvents.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        selectedCategory === "All" || event.category === selectedCategory

      let matchesDate = true
      const eventDateOnly = event.date_time.split("T")[0]

      if (selectedDate === "Upcoming") matchesDate = new Date(event.date_time) > now
      else if (selectedDate === "Happening Today") matchesDate = eventDateOnly === todayDate

      return matchesSearch && matchesCategory && matchesDate
    })
  }, [allEvents, searchTerm, selectedCategory, selectedDate])

  const registerForEvent = async (eventId: string) => {
    if (!user) return
    const event = allEvents.find((e) => e.id === eventId)
    if (!event) return
    const isRegistered = registrations.includes(eventId)

    if (isRegistered) {
      // UNREGISTER
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
      toast.success("You have unregistered successfully!")
    } else {
      // REGISTER
      if (event.current_attendees >= event.max_attendees) return toast.error("Event is full!")
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
      toast.success("You have registered successfully!")
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

  const EventDetailsDialog = ({ event }: { event: Event }) => {
    const [open, setOpen] = useState(false)
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <h4 className="font-semibold text-lg mb-2 cursor-pointer hover:text-emerald-600 transition-colors">
            {event.title}
          </h4>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <img
              src={event.image_url || "/placeholder.svg?height=300&width=600"}
              alt={event.title}
              className="w-full h-64 object-cover rounded-lg"
            />
            <div className="flex justify-end mt-2">
              <Heart
                className={`w-6 h-6 cursor-pointer ${
                  favorites.includes(event.id) ? "text-red-500 fill-current" : "text-gray-400"
                }`}
                onClick={() => toggleFavorite(event.id)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>{new Date(event.date_time).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>{new Date(event.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>{event.current_attendees} / {event.max_attendees} registrations</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">About This Event</h3>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t">
              <Button
                disabled={event.current_attendees >= event.max_attendees && !registrations.includes(event.id)}
                className={`flex-1 ${
                  registrations.includes(event.id)
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"
                }`}
                onClick={() => registerForEvent(event.id)}
              >
                {registrations.includes(event.id) ? "Registered (Click to Unregister)" :
                  event.current_attendees >= event.max_attendees ? "Full" : "Register Now"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  if (navigator.share) navigator.share({ title: event.title, text: event.description, url: window.location.href })
                  else { navigator.clipboard.writeText(window.location.href); toast.success("Event link copied") }
                }}
              >
                <Share2 className="w-4 h-4 mr-2" /> Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Loading events...</p></div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <Toaster position="top-right" />
      <header className="bg-white/80 sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <h1 className="text-xl font-bold">Event Schedule</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>Grid</Button>
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>List</Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Search events..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>

          <div className="flex flex-wrap gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Date" /></SelectTrigger>
              <SelectContent>{dateFilterOptions.map(d => <SelectItem key={d} value={d}>{d === "All" ? "All Dates" : d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-gray-600 mb-6">Showing {filteredEvents.length} of {allEvents.length} events</p>

        {viewMode === "grid" ? (

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <img src={event.image_url || "/placeholder.svg?height=200&width=400"} alt={event.title} className="w-full h-70 object-cover" />
                <div className="flex justify-end px-4 mt-2">
                  <Heart
                    className={`w-5 h-5 cursor-pointer ${favorites.includes(event.id) ? "text-red-500 fill-current" : "text-gray-400"}`}
                    onClick={() => toggleFavorite(event.id)}
                  />

                </div>
                <CardContent className="p-2">
                  <Badge variant="secondary">{event.category}</Badge>
                  <EventDetailsDialog event={event} />
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                  <div className="flex items-center justify-between">
                    <Button
                      onClick={() => registerForEvent(event.id)}
                      className={`text-sm ${registrations.includes(event.id) ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700"}`}
                    >
                      {registrations.includes(event.id) ? "Registered" : event.current_attendees >= event.max_attendees ? "Full" : "Register"}
                    </Button>
                    <span className="text-sm text-gray-500">{event.current_attendees}/{event.max_attendees}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="flex overflow-hidden hover:shadow-md transition-shadow">
                <img src={event.image_url || "/placeholder.svg?height=150&width=300"} alt={event.title} className="w-48 h-48 object-cover" />
                <div className="flex justify-end mt-2 px-4">
                  <Heart
                    className={`w-5 h-5 cursor-pointer ${favorites.includes(event.id) ? "text-red-500 fill-current" : "text-gray-400"}`}
                    onClick={() => toggleFavorite(event.id)}
                  />
                </div>
                <CardContent className="flex-1 p-4 flex flex-col justify-between">
                  <div>
                    <Badge variant="secondary">{event.category}</Badge>
                    <EventDetailsDialog event={event} />
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{event.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      onClick={() => registerForEvent(event.id)}
                      className={`text-sm ${registrations.includes(event.id) ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white"}`}
                    >
                      {registrations.includes(event.id) ? "Registered" : event.current_attendees >= event.max_attendees ? "Full" : "Register"}
                    </Button>
                    <span className="text-sm text-gray-500">{event.current_attendees}/{event.max_attendees}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
