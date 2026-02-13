"use client"

import { QRCodeCanvas } from "qrcode.react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EventQRDisplayProps {
  eventId: string
  eventQRCode: string
  eventTitle: string
}

export function EventQRDisplay({ eventId, eventQRCode, eventTitle }: EventQRDisplayProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Event QR Code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col items-center">
        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
          <QRCodeCanvas value={eventQRCode} size={200} level="H" includeMargin={true}  />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{eventTitle}</p>
          <p className="text-xs text-gray-500 mt-1">Code: {eventQRCode}</p>
        </div>
      </CardContent>
    </Card>
  )
}
