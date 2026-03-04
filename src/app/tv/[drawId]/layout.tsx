// TV pages don't use the app shell (no header/bottom nav)
export default function TVLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
