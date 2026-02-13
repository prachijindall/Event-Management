
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, MapPin, Users, Ticket, Heart, LogOut } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import ReactCalendar from "react-calendar"
import "react-calendar/dist/Calendar.css"

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
}

interface Profile {
  id: string
  full_name: string
  student_id: string
  year: string
  major: string
  avatar_url: string
}

const quickActions = [
  { icon: Calendar, label: "Schedule", color: "bg-emerald-500", href: "/schedule" },
  { icon: MapPin, label: "Campus Map", color: "bg-cyan-500", href: "/map" },
  { icon: Ticket, label: "My Tickets", color: "bg-violet-500", href: "/tickets" },
  { icon: Users, label: "Community", color: "bg-orange-500", href: "/community" },
]

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [events, setEvents] = useState<Event[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [registrations, setRegistrations] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showFavoritesList, setShowFavoritesList] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (profileData) setProfile(profileData)

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .order("date_time", { ascending: true })
        .limit(6)
      if (eventsData) setEvents(eventsData)

      const { data: favoritesData } = await supabase.from("favorites").select("event_id").eq("user_id", user.id)
      if (favoritesData) setFavorites(favoritesData.map((f) => f.event_id))

      const { data: registrationsData } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user.id)
      if (registrationsData) setRegistrations(registrationsData.map((r) => r.event_id))

      setLoading(false)
    }
    getUser()
  }, [])


  useEffect(() => {
    if (events.length === 0) return
    const slider = setInterval(() => setCurrentSlide((prev) => (prev + 1) % events.length), 4000)
    return () => clearInterval(slider)
  }, [events.length])

  // Countdown timer
  useEffect(() => {
    if (events.length === 0) return
    const targetDate = new Date(events[0].date_time).getTime()
    const timer = setInterval(() => {
      const diff = targetDate - new Date().getTime()
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        })
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [events])

  const toggleFavorite = async (eventId: string) => {
    if (!user) return
    const isFav = favorites.includes(eventId)
    if (isFav) {
      await supabase.from("favorites").delete().eq("event_id", eventId).eq("user_id", user.id)
      setFavorites((prev) => prev.filter((id) => id !== eventId))
    } else {
      await supabase.from("favorites").insert({ event_id: eventId, user_id: user.id })
      setFavorites((prev) => [...prev, eventId])
    }
  }
const registerForEvent = async (eventId: string) => {
  if (!user) return;

  const isRegistered = registrations.includes(eventId);
  const event = events.find((e) => e.id === eventId);
  if (!event) return;

 
  if (isRegistered) {
    await supabase
      .from("event_registrations")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    await supabase
      .from("events")
      .update({ current_attendees: Math.max(0, event.current_attendees - 1) })
      .eq("id", eventId);


    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, current_attendees: Math.max(0, e.current_attendees - 1) }
          : e
      )
    );

    setRegistrations((prev) => prev.filter((id) => id !== eventId));
    return;
  }

  if (event.current_attendees >= event.max_attendees) {
    alert("Event is full!");
    return;
  }

  await supabase
    .from("event_registrations")
    .insert({ event_id: eventId, user_id: user.id });

  await supabase
    .from("events")
    .update({ current_attendees: event.current_attendees + 1 })
    .eq("id", eventId);

  setEvents((prev) =>
    prev.map((e) =>
      e.id === eventId
        ? { ...e, current_attendees: e.current_attendees + 1 }
        : e
    )
  );

  setRegistrations((prev) => [...prev, eventId]);
};


  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getEventsForDate = (date: Date | null) => {
    if (!date) return []
    return events.filter((event) => {
      const eventDate = new Date(event.date_time)
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    })
  }

  const selectedDateEvents = getEventsForDate(selectedDate)

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50 relative">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 relative">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              WhereAbout
            </h1>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                onClick={() => setShowFavoritesList((prev) => !prev)}
              >
                <Heart className="w-4 h-4 text-red-500" />
              </Button>
              <Avatar className="w-8 h-8">
                <AvatarFallback
                  className="text-white font-semibold"
                  style={{
                    backgroundColor: `hsl(${((profile?.full_name?.charCodeAt(0) || 85) * 137.508) % 360}, 70%, 50%)`,
                  }}
                >
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Favorites List */}
            {showFavoritesList && (
              <div className="absolute right-4 top-20 w-72 bg-white shadow-lg rounded-lg z-50 p-4 max-h-[60vh] overflow-y-auto">
                <h4 className="font-semibold mb-2">My Favorites</h4>
                {favorites.length === 0 ? (
                  <p className="text-gray-500 text-sm">No favorite events yet</p>
                ) : (
                  <ul className="space-y-2">
                    {events
                      .filter((e) => favorites.includes(e.id))
                      .map((e) => (
                        <motion.li
                          key={e.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex justify-between items-center cursor-pointer p-2 rounded hover:bg-gray-100"
                          onClick={() => {
                            setShowFavoritesList(false)
                            const element = document.querySelector(`#event-${e.id}`)
                            if (element) {
                              element.scrollIntoView({ behavior: "smooth", block: "center" })
                              element.classList.add("ring-4", "ring-emerald-400", "ring-offset-2")
                              setTimeout(() => {
                                element.classList.remove("ring-4", "ring-emerald-400", "ring-offset-2")
                              }, 2000)
                            } else {
                              router.push(`/schedule#event-${e.id}`)
                            }
                          }}
                        >
                          <span>{e.title}</span>
                          <span className="text-gray-400 text-xs">{new Date(e.date_time).toLocaleDateString()}</span>
                        </motion.li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, {profile?.full_name || "Student"}! 👋</h2>
          <p className="text-gray-600">Ready for another exciting day at the college fest?</p>
        </div>

        {events.length > 0 && (
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Slider */}
            <Card className="relative overflow-hidden rounded-xl h-[300px] md:flex-1">
              <AnimatePresence>
                <motion.div
                  key={currentSlide}
                  className="absolute inset-0 w-full max-h-96 bg-gray-100 flex justify-center items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2 }}
                >
                  <img
  src={events[currentSlide]?.image_url || "/placeholder.svg?height=100&width=300"}
  alt={events[currentSlide]?.title || "Event Image"}
  className="w-full h-100 object-conatin object-center transition-transform duration-300 hover:scale-105"
/>

                </motion.div>
              </AnimatePresence>

              <CardContent className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 text-white">
                <h3 className="text-xl font-semibold mb-2">Next Event</h3>
                <p className="text-lg mb-4">{events[0]?.title || "Loading..."}</p>
                <div className="flex justify-center gap-4 mb-4">
                  {Object.entries(timeLeft).map(([unit, value]) => (
                    <div key={unit} className="text-center">
                      <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
                        <div className="text-2xl font-bold">{value}</div>
                        <div className="text-xs uppercase tracking-wide">{unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  className="bg-white text-emerald-600 hover:bg-gray-100"
                  onClick={() => events[0] && registerForEvent(events[0].id)}
                >
                  {events[0] && registrations.includes(events[0].id) ? "Registered" : "Register Now"}
                </Button>
              </CardContent>
            </Card>

            {/* Calendar on right */}
            <div className="md:w-80 w-full">
              <ReactCalendar
                value={null}
                onClickDay={(date) => {
                  const dayEvents = getEventsForDate(date)
                  if (dayEvents.length > 0) {
                    setSelectedDate(date)
                    setIsPopoverOpen(true)
                    console.log("[v0] Clicked date with events:", date, dayEvents)
                  }
                }}
                tileContent={({ date, view }) => {
                  if (view !== "month") return null

                  const dayEvents = getEventsForDate(date)

                  if (!dayEvents.length) return null

                  return (
                    <div className="flex justify-center w-full">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    </div>
                  )
                }}
                className="react-calendar border-none rounded-xl shadow-lg w-full p-4 overflow-visible"
              />

              {isPopoverOpen && selectedDateEvents.length > 0 && selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/20"
                    onClick={() => {
                      setIsPopoverOpen(false)
                      setSelectedDate(null)
                    }}
                  />

                  {/* Modal */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative bg-white shadow-xl rounded-lg p-6 text-sm text-gray-800 w-96 border border-gray-200 z-50"
                  >
                    <button
                      onClick={() => {
                        setIsPopoverOpen(false)
                        setSelectedDate(null)
                      }}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>

                    <div className="font-semibold text-gray-900 mb-4 text-base">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {selectedDateEvents.map((e) => (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pb-4 border-b last:border-b-0 last:pb-0"
                        >
                          <div className="font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer transition-colors">
                            {e.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            {new Date(e.date_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {e.location && (
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              {e.location}
                            </div>
                          )}
                          {e.description && <div className="text-xs text-gray-600 mt-2">{e.description}</div>}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <Link href={action.href} className="block">
                  <div
                    className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mx-auto mb-3`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured Events */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Featured Events</h3>
            <Link href="/schedule">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6 overflow-x-auto">
            {events.slice(0, 3).map((event) => (
              <Card
                key={event.id}
                id={`event-${event.id}`}
                className="overflow-hidden hover:shadow-lg transition-shadow relative min-w-[300px]"
              >
                <div className="relative">
                  <img
                    src={event.image_url || "/placeholder.svg?height=200&width=300"}
                    alt={event.title || "Event Image"}
                    className="w-full h-70 object-cover"
                  />
                </div>

                <CardContent className="p-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{event.category}</Badge>
                  </div>

                  <h4 className="font-semibold text-lg mb-2">{event.title || "Untitled Event"}</h4>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {event.date_time ? new Date(event.date_time).toLocaleDateString() : "--"} at{" "}
                        {event.date_time
                          ? new Date(event.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                          : "--"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location || "--"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{event.current_attendees || 0} registrations</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                        registrations.includes(event.id)
                          ? "text-emerald-600 bg-emerald-50 border border-emerald-200"
                          : "text-white bg-emerald-600 hover:bg-emerald-700"
                      }`}
                      onClick={() => registerForEvent(event.id)}
                    >
                      {registrations.includes(event.id) ? "Registered" : "Register"}
                    </button>
                    <Button size="sm" variant="outline" onClick={() => toggleFavorite(event.id)}>
                      <Heart
                        className={`w-4 h-4 ${favorites.includes(event.id) ? "fill-red-500 text-red-500" : "text-gray-600"}`}
                      />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Favorites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{favorites.length}</div>
              <p className="text-sm text-gray-600">Events saved</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Registered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-600">{registrations.length}</div>
              <p className="text-sm text-gray-600">Events registered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-600">{events.length}</div>
              <p className="text-sm text-gray-600">Upcoming events</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
