"use client"
import React, { createContext, useContext, useState } from "react"

type MapContextType = {
  searchLocation: string | null
  setSearchLocation: (loc: string | null) => void
}

const MapContext = createContext<MapContextType>({
  searchLocation: null,
  setSearchLocation: () => {},
})

export const MapProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchLocation, setSearchLocation] = useState<string | null>(null)
  return (
    <MapContext.Provider value={{ searchLocation, setSearchLocation }}>
      {children}
    </MapContext.Provider>
  )
}

export const useMapContext = () => useContext(MapContext)

