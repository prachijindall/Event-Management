"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, ArrowLeft, MapPin, Calendar, Navigation, Layers, X, Filter, Crosshair } from "lucide-react"
import Link from "next/link"

const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false })

type EventType = {
  id: string
  title: string
  description?: string
  date_time?: string
  location: string
  category?: string
  image_url?: string
  latitude?: number | null
  longitude?: number | null
}

export default function MapPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventType[]>([])
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>([])
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showSidebar, setShowSidebar] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)

  const categories = ["All", "Tech", "Career", "Cultural", "Dance", "Business", "Workshop", "Sports", "Music"]

  // Get user location
  useEffect(() => {
    if ("geolocation" in navigator) {
      setLocationLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setLocationLoading(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          setLocationLoading(false)
        }
      )
    }
  }, [])

  // Fetch events from Supabase
  useEffect(() => {
    const supabase = createClient()

    const fetchEvents = async () => {
      setLoading(true)
      const { data, error } = await supabase.from("events").select("*")
      if (error) console.error("Error fetching events:", error)
      else {
        setEvents(data || [])
        setFilteredEvents(data || [])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [])

  // Filter logic for search and category
  useEffect(() => {
    let filtered = events

    // Filter by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((e) => e.category === selectedCategory)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.title?.toLowerCase().includes(term) ||
          e.location?.toLowerCase().includes(term) ||
          e.category?.toLowerCase().includes(term)
      )
    }

    setFilteredEvents(filtered)
  }, [searchTerm, selectedCategory, events])

  // Handle Get Directions
  const handleGetDirections = () => {
    if (!selectedEvent) return

    const { latitude, longitude, location } = selectedEvent
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : "30.3538,76.3642"

    if (latitude && longitude) {
      const destination = `${latitude},${longitude}`
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`,
        "_blank"
      )
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${location} Thapar University Patiala`
        )}`,
        "_blank"
      )
    }
  }

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      setLocationLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setLocationLoading(false)
        },
        (error) => {
          console.error("Error getting location:", error)
          alert("Unable to get your location. Please enable location permissions.")
          setLocationLoading(false)
        }
      )
    } else {
      alert("Geolocation is not supported by your browser")
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl bg-black/90 border-b border-white/10">
        <div className="max-w-full mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/")}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-[#7dd3c0]/80 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <h1 className="font-serif text-2xl font-light tracking-tight">Campus Map</h1>
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.2em] mt-0.5">
                  {filteredEvents.length} Event Locations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Map Search Bar - Black Text */}
            

              {!userLocation && (
                <button
                  onClick={requestLocation}
                  disabled={locationLoading}
                  className="h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 text-white"
                >
                  <Crosshair className="w-3 h-3" />
                  {locationLoading ? "Getting..." : "My Location"}
                </button>
              )}
              
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`h-9 px-4 text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 ${
                  showSidebar
                    ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white"
                    : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 text-white"
                }`}
              >
                <Layers className="w-3 h-3" />
                {showSidebar ? "Hide" : "Show"} Events
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)] pt-20">
        {/* Sidebar */}
        {showSidebar && (
          <div className="w-96 bg-black border-r border-white/10 overflow-y-auto z-40">
            <div className="p-6 space-y-6">
              {/* Sidebar Search - Also Black Text */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 w-4 h-4 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search events or locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-neutral-300 h-10 pl-10 pr-4 text-black placeholder:text-neutral-500 focus:outline-none focus:border-[#7dd3c0] focus:ring-1 focus:ring-[#7dd3c0] transition-all text-sm rounded"
                  style={{ color: '#000000' }}
                />
              </div>

              {/* Category Filter */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-3 h-3 text-neutral-500" />
                  <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-500">Filter by Category</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-[10px] uppercase tracking-wider transition-all ${
                        selectedCategory === cat
                          ? "bg-gradient-to-r from-[#7dd3c0]/10 to-transparent border border-[#7dd3c0] text-white"
                          : "border border-white/10 hover:bg-white/5 hover:border-[#7dd3c0]/80 text-white"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Events List */}
              <div>
                <p className="text-[9px] uppercase tracking-[0.15em] text-neutral-500 mb-3">
                  {filteredEvents.length} Events Found
                </p>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="w-8 h-8 border border-white/10 border-t-[#7dd3c0] rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-neutral-500 text-xs">Loading events...</p>
                    </div>
                  ) : filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`cursor-pointer border rounded p-4 transition-all ${
                          selectedEvent?.id === event.id
                            ? "border-[#7dd3c0] bg-[#7dd3c0]/10"
                            : "border-white/10 bg-white/[0.02] hover:border-[#7dd3c0]/80"
                        }`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        {event.category && (
                          <span className="inline-block px-2 py-0.5 bg-white/10 border border-white/20 text-[9px] uppercase tracking-[0.15em] mb-2 text-white">
                            {event.category}
                          </span>
                        )}
                        <h3 className="font-serif text-base font-light text-white mb-1">{event.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                          <MapPin className="w-3 h-3" />
                          <span>{event.location}</span>
                        </div>
                        {event.date_time && (
                          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(event.date_time).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                        {event.description && (
                          <p className="text-xs text-neutral-500 line-clamp-2 mt-1">{event.description}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 border border-white/10">
                      <MapPin className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                      <p className="text-neutral-500 text-xs">No matching events found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Section */}
        <div className="flex-1 relative z-10">
          <MapComponent 
            events={filteredEvents} 
            selectedEvent={selectedEvent} 
            searchTerm={searchTerm}
          />

          
          </div>
        </div>
      </div>
   
  )
}