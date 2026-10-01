// Root route is served by app/page.tsx, not this file.
// This stub exists only because Next.js requires a page.tsx when a layout.tsx is present in a route group.
import { redirect } from 'next/navigation'
export default function AppPageStub() { redirect('/') }
