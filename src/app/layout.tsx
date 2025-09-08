// app/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Magic Web",
  description: "Checklist e Latest de ações",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "ui-sans-serif, system-ui" }}>
        <Header />
        <div style={{ padding: 16 }}>{children}</div>
      </body>
    </html>
  );
}

function Header() {
  const navStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: "1px solid #eee",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 10,
  };
  const linkStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "#111",
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#f9f9f9",
  };

  return (
    <nav style={navStyle}>
      <strong>Magic Web</strong>
      <div style={{ flex: 1 }} />
      <Link href="/" style={linkStyle}>Home</Link>
      <Link href="/checklist" style={linkStyle}>Checklist</Link>
      <Link href="/latest" style={linkStyle}>Latest</Link>
    </nav>
  );
}
