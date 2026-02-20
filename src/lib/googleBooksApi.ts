const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
const BASE_URL = "https://www.googleapis.com/books/v1/volumes"

export interface BookResult {
  id: string
  title: string
  author: string
  description: string
  coverUrl: string
  publishedDate: string
  pageCount: number
  averageRating: number
  ratingsCount: number
}

export async function searchBooks(query: string): Promise<BookResult[]> {
  if (!query.trim()) return []
  if (!GOOGLE_BOOKS_API_KEY) {
    console.error("Google Books API key not configured")
    return []
  }

  try {
    const response = await fetch(
      `${BASE_URL}?q=${encodeURIComponent(query)}&key=${GOOGLE_BOOKS_API_KEY}&maxResults=10`
    )

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.items) return []

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.volumeInfo.title || "Unknown Title",
      author: item.volumeInfo.authors?.join(", ") || "Unknown Author",
      description: item.volumeInfo.description || "No description available",
      coverUrl: item.volumeInfo.imageLinks?.thumbnail || "",
      publishedDate: item.volumeInfo.publishedDate || "",
      pageCount: item.volumeInfo.pageCount || 0,
      averageRating: item.volumeInfo.averageRating || 0,
      ratingsCount: item.volumeInfo.ratingsCount || 0,
    }))
  } catch (error) {
    console.error("Error searching books:", error)
    return []
  }
}
