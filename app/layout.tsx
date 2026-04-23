// app/layout.tsx
import "./globals.css"; // ← これが無いと全部崩れる

export const metadata = {
  title: "うちの子ナビ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
``