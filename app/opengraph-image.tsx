import { ImageResponse } from "next/og";

export const alt = "RIGYADH — 5,555 rigs. One field.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 70, background: "#080b09", color: "#ebe4cf", fontFamily: "monospace", border: "16px solid #1be24a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 28, letterSpacing: 6 }}><span style={{ width: 34, height: 34, background: "#1be24a" }} />RIGYADH // FIELD TRANSMISSION</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, lineHeight: .9, letterSpacing: -7 }}><span style={{ color: "#1be24a" }}>5,555 RIGS.</span><span>ONE FIELD.</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#d0a85c", fontSize: 24 }}><span>OPEN PRACTICE</span><span>3 DAILY RANKED ATTEMPTS</span></div>
    </div>,
    size,
  );
}
