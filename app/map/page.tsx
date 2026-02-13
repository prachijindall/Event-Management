
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";  
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft } from "lucide-react"; 


const MapComponent = dynamic(() => import("@/components/MapComponent"), { ssr: false });

type EventType = {
  id: string;
  title: string;
  description?: string;
  date_time?: string;
  location: string;
  category?: string;
  image_url?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export default function MapPage() {
  const router = useRouter(); 
  const [events, setEvents] = useState<EventType[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventType[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch events from Supabase
  useEffect(() => {
    const supabase = createClient();

    const fetchEvents = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("events").select("*");
      if (error) console.error("Error fetching events:", error);
      else {
        setEvents(data || []);
        setFilteredEvents(data || []);
      }
      setLoading(false);
    };

    fetchEvents();
  }, []);

  // Filter logic for search
  useEffect(() => {
    if (!searchTerm.trim()) setFilteredEvents(events);
    else {
      const term = searchTerm.toLowerCase();
      setFilteredEvents(
        events.filter(
          (e) =>
            e.title?.toLowerCase().includes(term) ||
            e.location?.toLowerCase().includes(term) ||
            e.category?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, events]);

  //  Handle Get Directions
  const handleGetDirections = () => {
    if (!selectedEvent) return;

    const { latitude, longitude, location } = selectedEvent;
    const thaparMainGate = "30.3538,76.3642";

    if (latitude && longitude) {
      const destination = `${latitude},${longitude}`;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${thaparMainGate}&destination=${destination}&travelmode=walking`,
        "_blank"
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${location} Thapar University Patiala`
        )}`,
        "_blank"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              
              <button
                onClick={() => router.push("/")}
                className="p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Campus Map</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Events List */}
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-gray-500 text-center py-4">Loading events...</p>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`cursor-pointer border rounded-lg p-3 transition ${
                      selectedEvent?.id === event.id
                        ? "border-indigo-500 shadow-md"
                        : "border-gray-200"
                    }`}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <h3 className="font-semibold text-gray-800">{event.title}</h3>
                    <p className="text-xs text-gray-500">{event.location}</p>
                    <p className="text-xs text-gray-400">{event.date_time}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {event.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No matching events found
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="flex-1 relative">
          <MapComponent
            events={filteredEvents}
            selectedEvent={selectedEvent}
            searchTerm={searchTerm} 
          />

          {/* Floating Legend */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
            <h3 className="font-semibold text-sm mb-3">Legend</h3>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Event Location</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t mt-2">
              <div className="w-4 h-4 bg-green-600 rounded-full"></div>
              <span className="text-xs text-gray-600">Your Location</span>
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}
