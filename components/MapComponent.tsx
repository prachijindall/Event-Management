
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

export default function MapComponent({ events, selectedEvent, searchTerm }: MapComponentProps) {
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
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

   
    // @ts-ignore
    const geocoder = L.Control.Geocoder.nominatim({
      geocodingQueryParams: {
        countrycodes: "IN",
        bounded: 1,
        viewbox: "76.3580,30.3490,76.3790,30.3595",
      },
      // @ts-ignore
      geocodingCallback: function (results: any, cb: any) {
        const input = (document.querySelector(
          ".leaflet-control-geocoder-form input"
        ) as HTMLInputElement)?.value?.toLowerCase();

        const filtered = results.filter(
          (r: any) =>
            L.latLngBounds(thaparBounds).contains(r.center) &&
            (!input || r.name?.toLowerCase().includes(input))
        );

        cb(filtered);
      },
    });

    // @ts-ignore
    const control = L.Control.geocoder({
      geocoder,
      placeholder: "Search inside Thapar campus.",
      defaultMarkGeocode: false,
      collapsed: false,
    })
      .on("markgeocode", (e: any) => {
        const { center, name } = e.geocode;
        if (L.latLngBounds(thaparBounds).contains(center)) {
          const marker = L.marker(center).addTo(map).bindPopup(`
            <b>${name}</b><br>
            <button 
              id="map-search-directions"
              style="
                background-color:#2563eb;
                color:white;
                border:none;
                border-radius:6px;
                padding:6px 10px;
                cursor:pointer;
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
        } else {
          alert(" Please search within Thapar University campus only.");
        }
      })
      .addTo(map);
  }, []);


  useEffect(() => {
    if (!searchTerm?.trim()) {
      mapRef.current?.closePopup();
    }
  }, [searchTerm]);

  // Create or update marker
  const ensureMarkerForEvent = async (event: EventType): Promise<L.Marker | null> => {
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

        await supabase.from("events").update({ latitude, longitude }).eq("id", event.id);
      } else {
        console.warn("No valid result inside Thapar for:", event.location);
        return null;
      }
    }

    const marker = L.marker([latitude, longitude]).addTo(map);

    //  Add "Get Directions" 
    const popupHTML = `
      <b>${event.title}</b><br>
      ${event.location}<br>
      <small>${event.category || ""}</small><br><br>
      <button 
        id="directions-${event.id}" 
        style="
          background-color:#2563eb;
          color:white;
          border:none;
          border-radius:6px;
          padding:6px 10px;
          cursor:pointer;
        ">
        Get Directions
      </button>
    `;

    marker.bindPopup(popupHTML);
    markersRef.current[event.id] = marker;

    marker.on("popupopen", () => {
      const btn = document.getElementById(`directions-${event.id}`);
      if (btn) {
        btn.addEventListener("click", () => {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
          window.open(url, "_blank");
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
        const marker = await ensureMarkerForEvent(event);
        if (marker) markersRef.current[event.id] = marker;
      }
    };

    if (events.length > 0) loadMarkers();
  }, [events]);


  useEffect(() => {
    const centerOnSelected = async () => {
      if (!mapRef.current || !selectedEvent) return;
      const map = mapRef.current;

      let marker = markersRef.current[selectedEvent.id];
      if (!marker) await ensureMarkerForEvent(selectedEvent);

      if (marker) {
        marker.openPopup();
        const { lat, lng } = marker.getLatLng();
        map.flyTo([lat, lng], 18, { animate: true, duration: 1.2 });
      } else {
        alert("Location for this event could not be found inside Thapar campus.");
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
