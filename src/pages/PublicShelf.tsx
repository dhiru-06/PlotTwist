import { useParams } from "react-router-dom"

import { ShelfPage } from "@/components/shelf-page"

export function PublicShelf() {
  const { username } = useParams<{ username: string }>()

  return <ShelfPage username={username || "reader"} isPublicView />
}
