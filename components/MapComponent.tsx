"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";
import { createClient } from "@/lib/supabase/client";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconRetinaUrl: (iconRetinaUrl as unknown as { src: string }).src || "",
  iconUrl: (iconUrl as unknown as { src: string }).src || "",
  shadowUrl: (shadowUrl as unknown as { src: string }).src || "",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

type EventType = {
  id: string;
  title: string;
  location: string;
  category?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type MapComponentProps = {
  events: EventType[];
  selectedEvent: EventType | null;
  searchTerm: string;
};

export default function MapComponent({
  events,
  selectedEvent,
  searchTerm,
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (mapRef.current) return;

    const thaparCenter: L.LatLngTuple = [30.3545, 76.369];
    const thaparBounds: L.LatLngBoundsExpression = [
      [30.349, 76.358],
      [30.3595, 76.379],
    ];

    const map = L.map("map", {
      center: thaparCenter,
      zoom: 17,
      minZoom: 15,
      maxZoom: 30,
      maxBounds: thaparBounds,
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    // Geocoder
    // @ts-ignore
    const geocoder = L.Control.Geocoder.nominatim({
      geocodingQueryParams: {
        countrycodes: "IN",
        bounded: 1,
        viewbox: "76.3580,30.3490,76.3790,30.3595",
      },
    });

    // @ts-ignore
    L.Control.geocoder({
      geocoder,
      placeholder: "Search inside Thapar campus.",
      defaultMarkGeocode: false,
      collapsed: false,
    })
      .on("markgeocode", (e: any) => {
        const { center, name } = e.geocode;

        const marker = L.marker(center).addTo(map).bindPopup(`
          <div style="font-weight:500; font-size:15px; margin-bottom:10px;">
            ${name}
          </div>

          <button 
            id="map-search-directions"
            style="
              width:100%;
              background:#7dd3c0;
              color:black;
              border:none;
              border-radius:8px;
              padding:8px 12px;
              cursor:pointer;
              font-size:11px;
              text-transform:uppercase;
              letter-spacing:1px;
            ">
            Get Directions
          </button>
        `);

        marker.openPopup();
        map.setView(center, 18);

        setTimeout(() => {
          const btn = document.getElementById("map-search-directions");
          if (btn) {
            btn.addEventListener("click", () => {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`,
                "_blank"
              );
            });
          }
        }, 200);
      })
      .addTo(map);
  }, []);

  useEffect(() => {
    if (!searchTerm?.trim()) {
      mapRef.current?.closePopup();
    }
  }, [searchTerm]);

  const ensureMarkerForEvent = async (
    event: EventType
  ): Promise<L.Marker | null> => {
    if (!mapRef.current) return null;
    const map = mapRef.current;
    const supabase = createClient();

    let { latitude, longitude } = event;

    if (!latitude || !longitude) {
      const query = encodeURIComponent(event.location);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&viewbox=76.358,30.349,76.379,30.3595&bounded=1`
      );
      const geo = await res.json();

      if (geo?.length > 0) {
        latitude = parseFloat(geo[0].lat);
        longitude = parseFloat(geo[0].lon);

        await supabase
          .from("events")
          .update({ latitude, longitude })
          .eq("id", event.id);
      } else {
        return null;
      }
    }

    const marker = L.marker([latitude, longitude]).addTo(map);

    const popupHTML = `
      <div style="font-family:inherit;">
        <div style="font-weight:500; font-size:16px; margin-bottom:4px;">
          ${event.title}
        </div>

        <div style="font-size:13px; opacity:0.8; margin-bottom:4px;">
          ${event.location}
        </div>

        ${
          event.category
            ? `<div style="font-size:11px; opacity:0.6; margin-bottom:10px;">
                ${event.category}
               </div>`
            : ""
        }

        <button 
          id="directions-${event.id}" 
          style="
            width:100%;
            background:#7dd3c0;
            color:black;
            border:none;
            border-radius:8px;
            padding:8px 12px;
            cursor:pointer;
            font-size:11px;
            text-transform:uppercase;
            letter-spacing:1px;
          ">
          Get Directions
        </button>
      </div>
    `;

    marker.bindPopup(popupHTML);
    markersRef.current[event.id] = marker;

    marker.on("popupopen", () => {
      const btn = document.getElementById(`directions-${event.id}`);
      if (btn) {
        btn.addEventListener("click", () => {
          window.open(
            `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
            "_blank"
          );
        });
      }
    });

    return marker;
  };

  useEffect(() => {
    const loadMarkers = async () => {
      if (!mapRef.current) return;

      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      for (const event of events) {
        await ensureMarkerForEvent(event);
      }
    };

    if (events.length > 0) loadMarkers();
  }, [events]);

  useEffect(() => {
    const centerOnSelected = async () => {
      if (!mapRef.current || !selectedEvent) return;

      let marker = markersRef.current[selectedEvent.id];
   

      if (marker) {
        marker.openPopup();
        const { lat, lng } = marker.getLatLng();
        mapRef.current?.flyTo([lat, lng], 18, {
          animate: true,
          duration: 1.2,
        });
      }
    };

    centerOnSelected();
  }, [selectedEvent]);

  return (
    <div
      id="map"
      style={{
        height: "500px",
        width: "100%",
        borderRadius: "12px",
      }}
    />
  );
}
