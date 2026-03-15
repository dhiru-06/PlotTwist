import { useEffect, useState } from "react"
import { searchBooks } from "@/lib/googleBooksApi"
import { Loader2, Search, X } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SectionOption = {
  id: string
  name: string
}

interface SearchBook {
  id: string
  title: string
  author: string
  coverUrl?: string
  averageRating: number
  ratingsCount: number
  pageCount: number
  description?: string
}

interface ExistingBookRow {
  id: string
  google_book_id: string
}

function clearShelfCache() {
  try {
    const keysToRemove: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith("plottwist:shelf-cache:")) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore storage cleanup errors.
  }
}

export function BookSearch() {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchBook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sections, setSections] = useState<SectionOption[]>([])
  const [resultSections, setResultSections] = useState<Record<string, string>>({})
  const [isAddingBookId, setIsAddingBookId] = useState<string | null>(null)

  async function loadSections(profileId: string) {
    const { data, error } = await supabase
      .from("sections")
      .select("id, name")
      .eq("profile_id", profileId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })

    if (error) {
      toast.error("Failed to load sections")
      return
    }

    setSections(data ?? [])
  }

  useEffect(() => {
    if (!user) {
      setSections([])
      return
    }

    void loadSections(user.id)
  }, [user])

  useEffect(() => {
    setResultSections((prev) => {
      const next = { ...prev }

      results.forEach((book) => {
        if (!next[book.id]) {
          next[book.id] = sections[0]?.id ?? ""
        }
      })

      return next
    })
  }, [results, sections])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (isModalOpen && searchQuery.trim()) {
        setIsLoading(true)
        const books = await searchBooks(searchQuery)
        setResults(books as SearchBook[])
        setIsLoading(false)
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, isModalOpen])

  const handleResultSectionChange = (bookId: string, sectionId: string) => {
    setResultSections((prev) => ({
      ...prev,
      [bookId]: sectionId,
    }))
  }

  const handleResetModal = () => {
    setSearchQuery("")
    setResults([])
    setResultSections({})
    setIsLoading(false)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    handleResetModal()
  }

  const handleAddBookToSection = async (book: SearchBook) => {
    if (!user) {
      toast.error("Please sign in to add books")
      return
    }

    const sectionId = resultSections[book.id] ?? sections[0]?.id ?? ""

    if (!sectionId) {
      toast.error("Choose a section")
      return
    }

    setIsAddingBookId(book.id)

    const { data: existingRows, error: existingRowsError } = await supabase
      .from("section_books")
      .select("id, google_book_id")
      .eq("profile_id", user.id)
      .eq("google_book_id", book.id)
      .limit(1)

    if (existingRowsError) {
      setIsAddingBookId(null)
      toast.error("Failed to add book")
      return
    }

    const existing = ((existingRows as ExistingBookRow[] | null) ?? [])[0]

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("section_books")
        .update({
          section_id: sectionId,
          title: book.title,
          author: book.author || null,
          cover_url: book.coverUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("profile_id", user.id)

      setIsAddingBookId(null)

      if (updateError) {
        toast.error("Failed to update book")
        return
      }

      clearShelfCache()
      toast.success("Book moved to selected section")
      window.dispatchEvent(new CustomEvent("section-books-changed"))
      return
    }

    const { error: insertError } = await supabase
      .from("section_books")
      .insert({
        section_id: sectionId,
        profile_id: user.id,
        google_book_id: book.id,
        title: book.title,
        author: book.author || null,
        cover_url: book.coverUrl || null,
        rating: null,
        notes: null,
        sort_order: 0,
      })

    setIsAddingBookId(null)

    if (insertError) {
      toast.error("Failed to add book")
      return
    }

    clearShelfCache()
    toast.success("Book added to section")
    window.dispatchEvent(new CustomEvent("section-books-changed"))
  }

  return (
    <div className="w-full space-y-4">
      <Button onClick={() => setIsModalOpen(true)} className="w-full" disabled={!user}>
        Add Book to Shelf
      </Button>

      {!user && (
        <p className="text-muted-foreground text-sm">Sign in to manage your shelf books.</p>
      )}

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleCloseModal}
        >
          <div
            className="bg-background w-full max-w-2xl rounded-xl border border-input p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add book to your shelf</h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search books (title, author, keyword...)"
                className="bg-background w-full rounded-lg border border-input py-2.5 pr-10 pl-9 text-sm"
              />
              {isLoading && (
                <Loader2 className="text-muted-foreground absolute top-3 right-3 h-4 w-4 animate-spin" />
              )}
            </div>

            <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-input">
              {results.map((book) => (
                <div
                  key={book.id}
                  className="flex items-start gap-3 border-b border-input/50 px-3 py-2 last:border-b-0"
                >
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="h-14 w-10 flex-shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="bg-accent h-14 w-10 flex-shrink-0 rounded" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="text-muted-foreground truncate text-xs">{book.author}</p>
                    <div className="mt-2">
                      <Select
                        value={resultSections[book.id] ?? ""}
                        onValueChange={(value: string) =>
                          handleResultSectionChange(book.id, value)
                        }
                      >
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue placeholder="Choose section" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddBookToSection(book)}
                    disabled={
                      isAddingBookId === book.id ||
                      sections.length === 0 ||
                      !(resultSections[book.id] ?? sections[0]?.id)
                    }
                  >
                    {isAddingBookId === book.id ? "Adding..." : "Add"}
                  </Button>
                </div>
              ))}

              {!isLoading && searchQuery && results.length === 0 && (
                <div className="text-muted-foreground p-3 text-center text-sm">
                  No books found.
                </div>
              )}
            </div>

            {sections.length === 0 && (
              <div className="text-muted-foreground mt-3 rounded-lg border border-dashed border-input p-3 text-sm">
                No sections found. Create sections first to save books.
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseModal}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
