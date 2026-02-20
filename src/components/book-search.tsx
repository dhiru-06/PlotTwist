import { useEffect, useState } from "react"
import { searchBooks } from "@/lib/googleBooksApi"
import { Loader2, Search, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ShelfSection = "want-to-read" | "currently-reading" | "finished"

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

interface SavedBook extends SearchBook {
  section: ShelfSection
}

const SECTION_LABELS: Record<ShelfSection, string> = {
  "want-to-read": "Want to Read",
  "currently-reading": "Currently Reading",
  finished: "Finished",
}

export function BookSearch() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchBook[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState<SearchBook | null>(null)
  const [selectedSection, setSelectedSection] = useState<ShelfSection | "">("")
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([])

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

  const handleSelectBook = (book: SearchBook) => {
    setSelectedBook(book)
    setResults([])
  }

  const handleResetModal = () => {
    setSearchQuery("")
    setSelectedBook(null)
    setSelectedSection("")
    setResults([])
    setIsLoading(false)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    handleResetModal()
  }

  const handleSaveBook = () => {
    if (!selectedBook || !selectedSection) {
      return
    }

    const alreadyExists = savedBooks.some((book) => book.id === selectedBook.id)
    if (alreadyExists) {
      setSavedBooks((prev) =>
        prev.map((book) =>
          book.id === selectedBook.id
            ? { ...book, section: selectedSection }
            : book
        )
      )
    } else {
      setSavedBooks((prev) => [
        ...prev,
        { ...selectedBook, section: selectedSection },
      ])
    }

    handleCloseModal()
  }

  const handleRemoveSavedBook = (id: string) => {
    setSavedBooks((prev) => prev.filter((book) => book.id !== id))
  }

  return (
    <div className="w-full space-y-4">
      <Button onClick={() => setIsModalOpen(true)} className="w-full">
        Add Book to Shelf
      </Button>

      {savedBooks.length > 0 && (
        <div className="space-y-2">
          {savedBooks.map((book) => (
            <div
              key={book.id}
              className="flex items-center justify-between rounded-lg border border-input bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{book.title}</p>
                <p className="text-muted-foreground truncate text-xs">{book.author}</p>
              </div>
              <div className="ml-3 flex items-center gap-2">
                <Badge variant="outline">{SECTION_LABELS[book.section]}</Badge>
                <button
                  type="button"
                  onClick={() => handleRemoveSavedBook(book.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${book.title}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
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
                <button
                  key={book.id}
                  type="button"
                  onClick={() => handleSelectBook(book)}
                  className="hover:bg-accent flex w-full items-start gap-3 border-b border-input/50 px-3 py-2 text-left last:border-b-0"
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
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="text-muted-foreground truncate text-xs">{book.author}</p>
                  </div>
                </button>
              ))}

              {!isLoading && searchQuery && results.length === 0 && (
                <div className="text-muted-foreground p-3 text-center text-sm">
                  No books found.
                </div>
              )}
            </div>

            {selectedBook && (
              <div className="mt-4 space-y-3 rounded-lg border border-input bg-accent/10 p-3">
                <div>
                  <p className="text-sm font-semibold">{selectedBook.title}</p>
                  <p className="text-muted-foreground text-xs">{selectedBook.author}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium">Select section</p>
                  <Select
                    value={selectedSection}
                    onValueChange={(value: string) =>
                      setSelectedSection(value as ShelfSection)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose shelf section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="want-to-read">Want to Read</SelectItem>
                      <SelectItem value="currently-reading">
                        Currently Reading
                      </SelectItem>
                      <SelectItem value="finished">Finished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveBook}
                disabled={!selectedBook || !selectedSection}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
