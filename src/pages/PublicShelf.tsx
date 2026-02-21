import { useParams } from "react-router-dom"

import { ShelfPage } from "@/components/shelf-page"

export function PublicShelf() {
  const { username } = useParams<{ username: string }>()
  const cleanUsername = (username ?? "reader").replace(/^@/, "")

  return <ShelfPage username={cleanUsername} isPublicView />
}
