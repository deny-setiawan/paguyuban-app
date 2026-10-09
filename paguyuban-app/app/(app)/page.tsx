// Stub untuk route group (app) — jangan redirect ke '/' karena bisa membuat loop.
import { redirect } from 'next/navigation'
export default function AppPageStub() { redirect('/beranda') }
