import { useParams } from "react-router-dom"

import { ShelfPage } from "@/components/shelf-page"

export function PublicShelf() {
  const { username } = useParams<{ username: string }>()
  
  console.log("PublicShelf - username from params:", username)

  return <ShelfPage username={username || "reader"} isPublicView />
}
