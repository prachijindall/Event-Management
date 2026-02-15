"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, MapPin, Users, Ticket, Bookmark, LogOut, TrendingUp, Star, Clock, ArrowRight, Bell, Target, Sparkles, CheckCircle } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
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
}

interface Profile {
  id: string
  full_name: string
  student_id: string
  year: string
  major: string
  avatar_url: string
}

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  event_id?: string
  read: boolean
  created_at: string
}

const quickActions = [
  { icon: Calendar, label: "Events", color: "from-[#7dd3c0] to-[#5fb8a8]", href: "/schedule" },
  { icon: MapPin, label: "Campus Map", color: "from-blue-500 to-blue-600", href: "/map" },
  { icon: Ticket, label: "My Tickets", color: "from-purple-500 to-purple-600", href: "/tickets" },
  { icon: Users, label: "Community", color: "from-orange-500 to-orange-600", href: "/community" },
]

export default function HomePage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [events, setEvents] = useState<Event[]>([])
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [registrations, setRegistrations] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showBookmarksList, setShowBookmarksList] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [heroSlide, setHeroSlide] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
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
      if (eventsData) setEvents(eventsData)

      // Fetch bookmarks from favorites table
      const { data: bookmarksData } = await supabase.from("favorites").select("event_id").eq("user_id", user.id)
      if (bookmarksData) setBookmarks(bookmarksData.map((f) => f.event_id))

      const { data: registrationsData } = await supabase
        .from("event_registrations")
        .select("event_id")
        .eq("user_id", user.id)
      if (registrationsData) setRegistrations(registrationsData.map((r) => r.event_id))

      // Fetch notifications from Supabase
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (notificationsData) {
        setNotifications(notificationsData)
        setUnreadCount(notificationsData.filter((n) => !n.read).length)
      }

      setLoading(false)
    }
    getUser()
  }, [])

  // Auto-scroll image slider
  useEffect(() => {
    if (events.length === 0) return
    const slider = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % Math.min(events.length, 8))
    }, 3000)
    return () => clearInterval(slider)
  }, [events.length])

  // Hero slider
  useEffect(() => {
    if (events.length === 0) return
    const slider = setInterval(() => setHeroSlide((prev) => (prev + 1) % Math.min(events.length, 3)), 5000)
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

  const toggleBookmark = async (eventId: string) => {
    if (!user) return
    const isBookmarked = bookmarks.includes(eventId)
    if (isBookmarked) {
      await supabase.from("favorites").delete().eq("event_id", eventId).eq("user_id", user.id)
      setBookmarks((prev) => prev.filter((id) => id !== eventId))
      toast.success("Bookmark removed")
    } else {
      await supabase.from("favorites").insert({ event_id: eventId, user_id: user.id })
      setBookmarks((prev) => [...prev, eventId])
      toast.success("Bookmarked")
    }
  }

  const registerForEvent = async (eventId: string) => {
    if (!user) return
    const isRegistered = registrations.includes(eventId)
    const event = events.find((e) => e.id === eventId)
    if (!event) return

    if (isRegistered) {
      await supabase.from("event_registrations").delete().eq("event_id", eventId).eq("user_id", user.id)
      await supabase.from("events").update({ current_attendees: Math.max(0, event.current_attendees - 1) }).eq("id", eventId)
      setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, current_attendees: Math.max(0, e.current_attendees - 1) } : e)))
      setRegistrations((prev) => prev.filter((id) => id !== eventId))
      toast.success("Registration cancelled")
      return
    }

    if (event.current_attendees >= event.max_attendees) {
      toast.error("Event is full!")
      return
    }

    await supabase.from("event_registrations").insert({ event_id: eventId, user_id: user.id })
    await supabase.from("events").update({ current_attendees: event.current_attendees + 1 }).eq("id", eventId)
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, current_attendees: e.current_attendees + 1 } : e)))
    setRegistrations((prev) => [...prev, eventId])

    // Create notification for successful registration
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "Registration Confirmed",
      message: `You've successfully registered for ${event.title}`,
      type: "registration",
      event_id: eventId,
      read: false,
    })

    // Refresh notifications
    const { data: newNotifications } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (newNotifications) {
      setNotifications(newNotifications)
      setUnreadCount(newNotifications.filter((n) => !n.read).length)
    }

    toast.success("Successfully registered!")
  }

  const markNotificationAsRead = async (notifId: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", notifId)
    setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border border-white/10 border-t-[#7dd3c0] rounded-full animate-spin mx-auto" />
          <p className="text-neutral-500 text-xs uppercase tracking-[0.2em]">Loading Dashboard</p>
        </div>
      </div>
    )
  }

  const registeredEvents = events.filter((e) => registrations.includes(e.id)).slice(0, 5)
  const todayEvents = events.filter((e) => {
    const eventDate = new Date(e.date_time)
    const today = new Date()
    return eventDate.toDateString() === today.toDateString()
  })

  return (
    <div className="min-h-screen bg-black text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a1a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/90 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7dd3c0] to-[#5fb8a8] rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-black" />
              </div>
              <h1 className="font-serif text-2xl font-light tracking-tight bg-gradient-to-r from-[#7dd3c0] to-white bg-clip-text text-transparent">
                WhereAbout
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button onClick={() => setShowNotifications((prev) => !prev)} className="relative w-9 h-9 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all flex items-center justify-center rounded-full">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Bookmarks */}
              <button onClick={() => setShowBookmarksList((prev) => !prev)} className="relative w-9 h-9 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all flex items-center justify-center rounded-full">
                <Bookmark className={`w-4 h-4 ${bookmarks.length > 0 ? "fill-[#7dd3c0] text-[#7dd3c0]" : ""}`} />
                {bookmarks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#7dd3c0] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                    {bookmarks.length}
                  </span>
                )}
              </button>

              <Avatar className="w-9 h-9 border-2 border-[#7dd3c0]/50">
                <AvatarFallback className="bg-gradient-to-br from-[#7dd3c0]/30 to-[#7dd3c0]/10 text-[#7dd3c0] font-semibold">
                  {profile?.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <button onClick={handleLogout} className="w-9 h-9 border border-white/10 hover:bg-white/5 hover:border-red-500/80 transition-all flex items-center justify-center rounded-full">
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-8 top-20 w-96 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl p-4 max-h-[60vh] overflow-y-auto z-50">
                <h4 className="font-serif text-lg mb-3 flex items-center justify-between">
                  Notifications
                  {unreadCount > 0 && <span className="text-xs text-[#7dd3c0]">{unreadCount} new</span>}
                </h4>
                {notifications.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No notifications</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 border rounded cursor-pointer transition-all ${
                          notif.read ? "border-white/10 bg-white/[0.02]" : "border-[#7dd3c0]/50 bg-[#7dd3c0]/10"
                        }`}
                        onClick={() => {
                          markNotificationAsRead(notif.id)
                          if (notif.event_id) {
                            router.push(`/schedule#event-${notif.event_id}`)
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Bell className="w-4 h-4 text-[#7dd3c0] mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm mb-1">{notif.title}</div>
                            <div className="text-xs text-neutral-400">{notif.message}</div>
                            <div className="text-[9px] text-neutral-600 mt-1">
                              {new Date(notif.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bookmarks Dropdown */}
            {showBookmarksList && (
              <div className="absolute right-8 top-20 w-80 bg-black/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl p-4 max-h-[60vh] overflow-y-auto z-50">
                <h4 className="font-serif text-lg mb-3">Bookmarked Events</h4>
                {bookmarks.length === 0 ? (
                  <p className="text-neutral-500 text-sm">No bookmarks yet</p>
                ) : (
                  <div className="space-y-2">
                    {events.filter((e) => bookmarks.includes(e.id)).map((e) => (
                      <div key={e.id} className="p-3 border border-white/10 rounded hover:border-[#7dd3c0]/80 transition-all cursor-pointer" onClick={() => router.push(`/schedule#event-${e.id}`)}>
                        <div className="font-medium text-white mb-1">{e.title}</div>
                        <div className="text-xs text-neutral-400">{new Date(e.date_time).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pt-20 max-w-7xl mx-auto px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="font-serif text-4xl font-light tracking-tight mb-2">
            Welcome back, <span className="text-[#7dd3c0]">{profile?.full_name || "Student"}</span>! 👋
          </h2>
          <p className="text-neutral-400">Ready for another exciting day at the college fest?</p>
        </div>

        {/* Hero Section with Countdown - REDUCED SIZE */}
        {events.length > 0 && (
          <div className="mb-8 relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]" style={{ height: '350px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={heroSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="absolute inset-0"
              >
                <img
                  src={events[heroSlide]?.image_url || "/placeholder.svg"}
                  alt={events[heroSlide]?.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6">
              <div className="inline-block px-3 py-1 bg-[#7dd3c0]/20 border border-[#7dd3c0]/50 text-[#7dd3c0] text-xs uppercase tracking-[0.2em] mb-3">
                Next Event
              </div>
              <h3 className="font-serif text-4xl font-light text-white mb-4 text-center">{events[0]?.title}</h3>
              
              <div className="flex gap-4 mb-6">
                {Object.entries(timeLeft).map(([unit, value]) => (
                  <div key={unit} className="text-center">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 min-w-[70px]">
                      <div className="text-2xl font-bold text-[#7dd3c0]">{value}</div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400 mt-1">{unit}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => events[0] && registerForEvent(events[0].id)}
                className="h-10 px-6 bg-gradient-to-r from-[#7dd3c0]/20 to-[#7dd3c0]/10 border border-[#7dd3c0] text-white hover:from-[#7dd3c0] hover:to-[#7dd3c0]/80 hover:text-black transition-all text-xs uppercase tracking-[0.15em] flex items-center gap-2"
              >
                {events[0] && registrations.includes(events[0].id) ? "Registered ✓" : "Register Now"}
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Slide indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {events.slice(0, 3).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === heroSlide ? "bg-[#7dd3c0] w-8" : "bg-white/30"}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Auto-scrolling Image Slider */}
        {events.length > 0 && (
          <div className="mb-8 overflow-hidden">
            <h3 className="font-serif text-2xl font-light mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#7dd3c0]" />
              Trending Events
            </h3>
            <div className="relative overflow-hidden">
              <motion.div
                className="flex gap-4"
                animate={{ x: `-${currentSlide * 284}px` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                {events.slice(0, 8).map((event) => (
                  <div
                    key={event.id}
                    className="min-w-[280px] h-[160px] relative rounded-lg overflow-hidden border border-white/10 hover:border-[#7dd3c0]/80 transition-all cursor-pointer group"
                    onClick={() => router.push(`/schedule#event-${event.id}`)}
                  >
                    <img src={event.image_url || "/placeholder.svg"} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="inline-block px-2 py-0.5 bg-[#7dd3c0]/20 border border-[#7dd3c0]/50 text-[#7dd3c0] text-[9px] uppercase tracking-wider mb-1">
                        {event.category}
                      </span>
                      <h4 className="font-serif text-sm text-white line-clamp-1">{event.title}</h4>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <Link key={index} href={action.href}>
              <div className="p-6 border border-white/10 bg-white/[0.02] rounded-lg hover:border-[#7dd3c0]/80 transition-all cursor-pointer group">
                <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <p className="font-medium text-white text-sm">{action.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* My Registered Events - CLICK TO GO TO SCHEDULE */}
        <div className="mb-8">
          <h3 className="font-serif text-2xl font-light mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#7dd3c0]" />
            My Registered Events
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {registeredEvents.length === 0 ? (
              <div className="col-span-2 p-12 border border-white/10 rounded-lg text-center">
                <Sparkles className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <p className="text-neutral-500">No registered events yet</p>
                <Link href="/schedule">
                  <button className="mt-4 h-9 px-4 border border-white/10 hover:border-[#7dd3c0]/80 text-xs uppercase tracking-[0.15em]">
                    Browse Events
                  </button>
                </Link>
              </div>
            ) : (
              registeredEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 border border-[#7dd3c0]/50 bg-[#7dd3c0]/10 rounded-lg cursor-pointer hover:border-[#7dd3c0] transition-all"
                  onClick={() => router.push(`/schedule#event-${event.id}`)}
                >
                  <div className="flex items-start gap-4">
                    <img src={event.image_url || "/placeholder.svg"} alt={event.title} className="w-20 h-20 rounded object-cover" />
                    <div className="flex-1">
                      <h4 className="font-serif text-lg text-white mb-1">{event.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(event.date_time).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <div className="mb-8">
            <h3 className="font-serif text-2xl font-light mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-[#7dd3c0]" />
              Happening Today
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {todayEvents.map((event) => (
                <div key={event.id} className="p-4 border border-white/10 bg-white/[0.02] rounded-lg hover:border-[#7dd3c0]/80 transition-all cursor-pointer" onClick={() => router.push(`/schedule#event-${event.id}`)}>
                  <span className="inline-block px-2 py-0.5 bg-red-500/20 border border-red-500/50 text-red-400 text-[9px] uppercase tracking-wider mb-2">
                    Live Today
                  </span>
                  <h4 className="font-serif text-base text-white mb-2">{event.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(event.date_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border border-white/10 bg-white/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Bookmarks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#7dd3c0]">{bookmarks.length}</div>
              <p className="text-xs text-neutral-400 mt-1">Events bookmarked</p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Registered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{registrations.length}</div>
              <p className="text-xs text-neutral-400 mt-1">Events registered</p>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/[0.02]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">{events.length}</div>
              <p className="text-xs text-neutral-400 mt-1">Upcoming events</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}