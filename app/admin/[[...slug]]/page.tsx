import { redirect } from "next/navigation"

interface AdminLegacyRedirectPageProps {
  params: Promise<{ slug?: string[] }> 
}

export default async function AdminLegacyRedirectPage({ params }: AdminLegacyRedirectPageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.slug?.join("/") ?? ""
  redirect(slug ? `/ks7q/${slug}` : "/ks7q")
}
