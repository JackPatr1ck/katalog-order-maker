import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/format";
import logoUrl from "@/assets/logo.png";

interface TicketItem { name: string; quantity: number; price_cents: number; }
interface TicketInput {
  orderNumber: number | string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  address: string;
  note?: string | null;
  items: TicketItem[];
  totalCents: number;
  currency: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateTicketBlob(t: TicketInput): Promise<Blob> {
  const W = 800;
  const PAD = 40;
  const dpr = 2;

  // Pre-measure to determine height
  const tmp = document.createElement("canvas").getContext("2d")!;
  tmp.font = "14px system-ui, -apple-system, sans-serif";
  const itemLines = t.items.flatMap(it =>
    wrap(tmp, `${it.quantity}× ${it.name}`, W - PAD * 2 - 120)
  );
  const noteLines = t.note ? wrap(tmp, t.note, W - PAD * 2) : [];

  const headerH = 180;
  const infoH = 200;
  const itemsH = 60 + itemLines.length * 24 + t.items.length * 4;
  const totalH = 80;
  const noteH = noteLines.length ? 30 + noteLines.length * 22 : 0;
  const footerH = 80;
  const H = headerH + infoH + itemsH + totalH + noteH + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Top brand bar
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(0, 0, W, 120);

  // Logo
  try {
    const logo = await loadImage(logoUrl);
    const logoSize = 56;
    ctx.drawImage(logo, PAD, 32, logoSize, logoSize);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
    ctx.fillText("Katalog", PAD + logoSize + 16, 70);
  } catch {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px system-ui, -apple-system, sans-serif";
    ctx.fillText("Katalog", PAD, 75);
  }

  // Order # on right
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("ORDER", W - PAD, 50);
  ctx.font = "bold 24px system-ui, -apple-system, sans-serif";
  ctx.fillText(`#${t.orderNumber}`, W - PAD, 78);
  ctx.textAlign = "left";

  // Business name section
  let y = 150;
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(t.businessName, PAD, y);
  y += 30;

  // Divider
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 28;

  // Customer info
  const drawRow = (label: string, value: string) => {
    ctx.fillStyle = "#64748B";
    ctx.font = "12px system-ui, -apple-system, sans-serif";
    ctx.fillText(label.toUpperCase(), PAD, y);
    ctx.fillStyle = "#0F172A";
    ctx.font = "15px system-ui, -apple-system, sans-serif";
    ctx.fillText(value, PAD, y + 20);
    y += 50;
  };
  drawRow("Customer", t.customerName);
  drawRow("Phone", t.customerPhone);
  drawRow("Delivery address", t.address);

  // Items header
  y += 10;
  ctx.fillStyle = "#64748B";
  ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
  ctx.fillText("ITEMS", PAD, y);
  y += 8;
  ctx.strokeStyle = "#E2E8F0";
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 24;

  // Items
  ctx.font = "15px system-ui, -apple-system, sans-serif";
  for (const it of t.items) {
    const lines = wrap(ctx, `${it.quantity}× ${it.name}`, W - PAD * 2 - 140);
    ctx.fillStyle = "#0F172A";
    lines.forEach((ln, i) => ctx.fillText(ln, PAD, y + i * 22));
    ctx.textAlign = "right";
    ctx.fillText(formatMoney(it.price_cents * it.quantity, t.currency), W - PAD, y);
    ctx.textAlign = "left";
    y += lines.length * 22 + 8;
  }

  // Total
  y += 10;
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, y);
  ctx.lineTo(W - PAD, y);
  ctx.stroke();
  y += 32;
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
  ctx.fillText("TOTAL", PAD, y);
  ctx.textAlign = "right";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(formatMoney(t.totalCents, t.currency), W - PAD, y);
  ctx.textAlign = "left";
  y += 30;

  // Note
  if (noteLines.length) {
    y += 16;
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 12px system-ui, -apple-system, sans-serif";
    ctx.fillText("NOTE", PAD, y);
    y += 20;
    ctx.fillStyle = "#0F172A";
    ctx.font = "14px system-ui, -apple-system, sans-serif";
    noteLines.forEach((ln, i) => ctx.fillText(ln, PAD, y + i * 20));
    y += noteLines.length * 20;
  }

  // Footer
  y = H - 40;
  ctx.fillStyle = "#94A3B8";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Powered by Katalog", W / 2, y);
  ctx.textAlign = "left";

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Failed to render ticket"))), "image/png");
  });
}

export async function uploadTicket(orderId: string, blob: Blob): Promise<string> {
  const path = `${orderId}.png`;
  const { error } = await supabase.storage
    .from("order-tickets")
    .upload(path, blob, { contentType: "image/png", upsert: false });
  // Ignore duplicate-object errors: the ticket for this order already exists.
  if (error && !/exists/i.test(error.message)) throw error;
  const { data } = supabase.storage.from("order-tickets").getPublicUrl(path);
  return data.publicUrl;
}
