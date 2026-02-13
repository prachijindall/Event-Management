import 'dotenv/config';
import { createClient } from "@supabase/supabase-js";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,         
  process.env.SUPABASE_SERVICE_ROLE_KEY         
);

function generateQRString() {
  const id = uuidv4();
  const suffix = Math.random().toString(36).substring(2, 10);
  return `EVENT-${id}-${suffix}`;
}


async function generateEventQR(eventId) {
  try {
    // Generate QR string
    const qrText = generateQRString();
    console.log("Generated QR:", qrText);

    // Generate QR image
    const qrImageBuffer = await QRCode.toBuffer(qrText, {
      errorCorrectionLevel: "H",
      width: 500
    });

    
    const filePath = `event_qr/${eventId}.png`;

    // Upload file
    const { error: uploadError } = await supabase.storage
      .from("qr_codes")
      .upload(filePath, qrImageBuffer, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("Upload Error:", uploadError);
      return;
    }

    // Public URL of QR
    const { data: publicUrlData } = supabase.storage
      .from("qr_codes")
      .getPublicUrl(filePath);

    const qrImageUrl = publicUrlData.publicUrl;
    console.log("QR Image URL:", qrImageUrl);

    // Update event row in Supabase
    const { error: updateError } = await supabase
      .from("events")
      .update({
        event_qr_code: qrText,      
        qr_image_url: qrImageUrl
      })
      .eq("id", eventId);

    if (updateError) {
      console.error(" DB Update Error:", updateError);
      return;
    }

    console.log("QR Saved Successfully for Event:", eventId);

  } catch (err) {
    console.error("Unexpected Error:", err);
  }
}


const eventId = process.argv[2];

if (!eventId) {
  console.log(" Usage: node generate_event_qr.js <eventId>");
  process.exit(1);
}

generateEventQR(eventId);
