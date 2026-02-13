"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SidebarProps = {
  onSelectEvent: (event: { lat: number; lng: number; name: string }) => void;
};

export default function Sidebar({ onSelectEvent }: SidebarProps) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("events").select("*");
      if (error) console.error("Error fetching events:", error);
      else setEvents(data || []);
    };
    fetchEvents();
  }, []);

  const handleEventClick = (event: any) => {
    if (event.latitude && event.longitude) {
      
      onSelectEvent({
        lat: event.latitude,
        lng: event.longitude,
        name: event.title,
      });
    } else {
      alert("Location coordinates not found for this event.");
    }
  };

  return (
    <div className="w-1/3 bg-white border-r border-gray-300 overflow-y-auto p-4">
      <h2 className="text-xl font-semibold mb-4">📅 Upcoming Events</h2>
      <ul>
        {events.map((event) => (
          <li
            key={event.id}
            onClick={() => handleEventClick(event)}
            className="cursor-pointer p-3 mb-2 border-b border-gray-200 rounded hover:bg-gray-100 transition"
          >
            <div className="font-medium">{event.title}</div>
            <div className="text-sm text-gray-600">{event.location}</div>
            <div className="text-xs text-gray-500">{event.category}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
