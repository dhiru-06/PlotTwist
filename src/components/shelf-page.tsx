import { useState } from "react"
import { Card } from "@/components/ui/card"

interface Book {
  id: number
  title: string
  author: string
  color: string
  rating: number
  notes: string
}

const MOCK_BOOKS: Book[] = [
  {
    id: 1,
    title: "Circe",
    author: "Madeline Miller",
    color: "from-blue-500 to-purple-600",
    rating: 5,
    notes: "A stunning retelling of mythology.",
  },
  {
    id: 2,
    title: "Never Let Me Go",
    author: "Kazuo Ishiguro",
    color: "from-red-500 to-orange-500",
    rating: 4.8,
    notes: "Hauntingly beautiful and emotional.",
  },
  {
    id: 3,
    title: "The Night Circus",
    author: "Erin Morgenstern",
    color: "from-slate-700 to-slate-900",
    rating: 4.5,
    notes: "Magical and enchanting atmosphere.",
  },
  {
    id: 4,
    title: "Project Hail Mary",
    author: "Andy Weir",
    color: "from-green-600 to-teal-600",
    rating: 5,
    notes: "Incredible science fiction adventure!",
  },
  {
    id: 5,
    title: "The Song of Achilles",
    author: "Madeline Miller",
    color: "from-amber-500 to-yellow-600",
    rating: 5,
    notes: "Beautiful and heartbreaking love story.",
  },
  {
    id: 6,
    title: "Klara and the Sun",
    author: "Kazuo Ishiguro",
    color: "from-cyan-500 to-blue-500",
    rating: 4.3,
    notes: "Thought-provoking AI perspective.",
  },
]

// Group books into shelves (3 books per shelf)
const SHELVES = []
for (let i = 0; i < MOCK_BOOKS.length; i += 3) {
  SHELVES.push(MOCK_BOOKS.slice(i, i + 3))
}

interface SocialLink {
  platform: string
  url: string
  icon: string
}

const THEMES = {
  light: {
    background: "from-amber-50 via-stone-50 to-neutral-100",
    shelf: "from-stone-300 to-stone-400",
  },
  dark: {
    background: "from-neutral-900 via-neutral-800 to-stone-900",
    shelf: "from-neutral-700 to-neutral-800",
  },
  vintage: {
    background: "from-amber-100 via-orange-50 to-yellow-50",
    shelf: "from-amber-800 to-amber-900",
  },
}

interface ShelfPageProps {
  username?: string
  isPublicView?: boolean
}

export function ShelfPage({ username = "maya", isPublicView = false }: ShelfPageProps) {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark" | "vintage">("light")
  const [hoveredBook, setHoveredBook] = useState<{ shelfIndex: number; bookIndex: number } | null>(null)
  const [customHeader, setCustomHeader] = useState("")
  const [showCustomHeader, setShowCustomHeader] = useState(false)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([
    { platform: "Twitter", url: "", icon: "𝕏" },
    { platform: "Instagram", url: "", icon: "📷" },
    { platform: "Goodreads", url: "", icon: "📚" },
  ])

  const currentTheme = THEMES[theme]

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background}`}>
      {/* Custom Header */}
      {showCustomHeader && customHeader && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-8 text-center font-semibold">
          {customHeader}
        </div>
      )}

      {/* Header */}
      <header className="backdrop-blur-sm bg-background/80 border-b border-input/50 px-8 py-5 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm font-medium hover:text-foreground/80 transition-all hover:gap-3"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {!isPublicView && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input hover:bg-accent text-sm font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Customize</span>
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input hover:bg-accent text-sm font-medium transition-all">
            <span>Share</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {!isPublicView && showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <Card className="bg-background max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Customize Your Shelf</h2>
                <button onClick={() => setShowSettings(false)} className="text-2xl hover:text-foreground/70">&times;</button>
              </div>

              {/* Theme Selection */}
              <div className="space-y-3">
                <label className="font-semibold">Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => setTheme(themeName)}
                      className={`p-4 rounded-lg border-2 transition-all capitalize ${
                        theme === themeName ? "border-purple-500 bg-purple-50 dark:bg-purple-950" : "border-input hover:border-purple-300"
                      }`}
                    >
                      <div className={`h-16 rounded bg-gradient-to-br ${THEMES[themeName].background} mb-2`}></div>
                      {themeName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Header */}
              <div className="space-y-3">
                <label className="font-semibold">Custom Header</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={showCustomHeader}
                    onChange={(e) => setShowCustomHeader(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Show custom header</span>
                </div>
                <input
                  type="text"
                  value={customHeader}
                  onChange={(e) => setCustomHeader(e.target.value)}
                  placeholder="Enter your header text..."
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background"
                />
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <label className="font-semibold">Social Links</label>
                {socialLinks.map((link, index) => (
                  <div key={link.platform} className="flex items-center gap-2">
                    <span className="text-xl w-8">{link.icon}</span>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...socialLinks]
                        newLinks[index].url = e.target.value
                        setSocialLinks(newLinks)
                      }}
                      placeholder={`${link.platform} URL`}
                      className="flex-1 px-4 py-2 rounded-lg border border-input bg-background"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Save Changes
              </button>
            </div>
          </Card>
        </div>
      )}

      <div className="flex">
        {/* Left Sidebar - Profile */}
        <aside className="w-80 border-r border-input/30 p-6 min-h-screen backdrop-blur-sm bg-background/30">
          <Card className="bg-gradient-to-br from-white/80 to-white/40 dark:from-neutral-800/80 dark:to-neutral-900/40 backdrop-blur-xl border border-input/50 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-2xl font-bold text-white shadow-lg flex-shrink-0">
                M
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">@{username}</h2>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Welcome to my digital library. A curated collection of stories that shaped my
              perspective.
            </p>

            <div className="space-y-3 pt-4 border-t border-input/30">
              <div className="flex items-center justify-between p-2 rounded-xl bg-accent/50">
                <span className="text-xs font-medium text-muted-foreground">Books</span>
                <span className="font-bold text-lg">{MOCK_BOOKS.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-accent/50">
                <span className="text-xs font-medium text-muted-foreground">Avg Rating</span>
                <span className="font-bold text-lg">4.8 ★</span>
              </div>
            </div>

            {/* Social Links */}
            {socialLinks.some(link => link.url) && (
              <div className="pt-4 border-t border-input/30">
                <p className="text-xs font-semibold text-muted-foreground mb-3">Connect</p>
                <div className="flex gap-2">
                  {socialLinks.map((link) => link.url && (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-accent/50 hover:bg-accent flex items-center justify-center text-lg transition-all hover:scale-110"
                      title={link.platform}
                    >
                      {link.icon}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </aside>

        {/* Main Content - Bookshelf */}
        <main className="flex-1 p-8 max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">My Library</h2>
            <p className="text-sm text-muted-foreground">A collection of books that inspire me</p>
          </div>

          {/* Shelves stacked vertically */}
          <div className="space-y-16">
            {SHELVES.map((shelf, shelfIndex) => (
              <div key={shelfIndex} className="relative">
                {/* Shelf */}
                <div className="relative">
                  {/* Books on this shelf */}
                  <div className="flex gap-3 items-end pb-6 justify-start">
                    {shelf.map((book, index) => (
                      (() => {
                        const isHovered = hoveredBook?.shelfIndex === shelfIndex && hoveredBook?.bookIndex === index
                        const shouldShiftRight =
                          hoveredBook?.shelfIndex === shelfIndex && hoveredBook.bookIndex < index

                        return (
                      <div
                        key={book.id}
                        onMouseEnter={() => setHoveredBook({ shelfIndex, bookIndex: index })}
                        onMouseLeave={() => setHoveredBook(null)}
                        onClick={() => setSelectedBook(book)}
                        className={`book-container cursor-pointer relative transition-all duration-700 ${
                          isHovered ? "z-30" : "z-10"
                        }`}
                        style={{
                          perspective: "2000px",
                          animationDelay: `${index * 100}ms`,
                          transform: shouldShiftRight ? "translateX(136px)" : "translateX(0)",
                        }}
                      >
                        {/* 3D Book - spine forward by default, face rotates in on hover */}
                        <div className="relative w-10 h-52" style={{ transformStyle: "preserve-3d" }}>
                          {/* Book Spine (default visible) */}
                          <div
                            className={`book-spine relative w-10 h-52 bg-gradient-to-r ${book.color} rounded-sm shadow-lg`}
                            style={{
                              boxShadow: "4px 4px 12px rgba(0,0,0,0.3), inset -2px 0 4px rgba(0,0,0,0.2)",
                            }}
                          >
                            {/* Book texture */}
                            <div className="absolute inset-0 opacity-20" style={{
                              backgroundImage: `
                                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px),
                                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)
                              `
                            }}></div>

                            {/* Glossy overlay */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-black/20 rounded-sm"></div>

                            {/* Spine text */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="writing-mode-vertical text-white font-bold text-sm px-2 text-center drop-shadow-lg" style={{
                                textShadow: "2px 2px 4px rgba(0,0,0,0.5)"
                              }}>
                                {book.title}
                              </div>
                            </div>

                            {/* Spine edge highlight */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/30 rounded-l-sm"></div>
                            <div className="absolute right-0 top-0 bottom-0 w-1 bg-black/30 rounded-r-sm"></div>
                          </div>

                          {/* Front Cover (rotates into view on hover) */}
                          <div
                            className={`book-face absolute top-0 left-[9px] w-32 h-52 bg-gradient-to-br ${book.color} shadow-2xl overflow-hidden`}
                            style={{
                              borderRadius: "0 4px 4px 0",
                              boxShadow: "10px 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(255,255,255,0.1)",
                            }}
                          >
                            {/* Texture */}
                            <div className="absolute inset-0 opacity-25" style={{
                              backgroundImage: `
                                repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.02) 1px, rgba(255,255,255,0.02) 2px),
                                repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.02) 1px, rgba(0,0,0,0.02) 2px)
                              `
                            }}></div>

                            {/* Lighting effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-black/30 opacity-60"></div>

                            {/* Content */}
                            <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 text-white text-center">
                              <div className="space-y-2">
                                <h3 className="font-bold text-base leading-tight tracking-wide" style={{
                                  textShadow: "2px 2px 8px rgba(0,0,0,0.8)"
                                }}>{book.title}</h3>
                                <div className="h-px w-12 bg-white/40 mx-auto"></div>
                                <p className="text-xs tracking-wider opacity-95" style={{
                                  textShadow: "1px 1px 4px rgba(0,0,0,0.6)"
                                }}>{book.author}</p>
                              </div>
                              <div className="mt-auto flex items-center gap-1">
                                <div className="text-xl">★</div>
                                <div className="text-base font-bold">{book.rating}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                        )
                      })()
                    ))}
                  </div>

                  {/* Shelf surface */}
                  <div className={`h-4 bg-gradient-to-b ${currentTheme.shelf} rounded-sm shadow-inner relative`}>
                    <div className="absolute inset-0 opacity-30" style={{
                      backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 4px)"
                    }}></div>
                  </div>
                  
                  {/* Shelf shadow */}
                  <div className="h-1 bg-gradient-to-b from-black/10 to-transparent rounded-sm"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={() => setSelectedBook(null)}
        >
          <Card
            className="bg-gradient-to-br from-white/95 to-white/80 dark:from-neutral-800/95 dark:to-neutral-900/80 backdrop-blur-xl border border-input/50 rounded-3xl p-10 max-w-3xl w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-8">
              <div
                className={`w-48 h-72 bg-gradient-to-br ${selectedBook.color} rounded-xl shadow-2xl flex-shrink-0 flex items-center justify-center text-white font-bold text-center p-6 relative overflow-hidden`}
              >
                {/* Texture */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: `
                    repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px),
                    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)
                  `
                }}></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
                <div className="relative z-10">
                  <div className="text-2xl mb-3 leading-tight drop-shadow-lg">{selectedBook.title}</div>
                  <div className="text-sm opacity-80 drop-shadow">{selectedBook.author}</div>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-bold mb-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">{selectedBook.title}</h2>
                <p className="text-xl text-muted-foreground mb-6">{selectedBook.author}</p>

                <div className="mb-8 flex gap-4">
                  <div className="px-6 py-3 bg-accent/50 rounded-xl border border-input/30">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Rating</div>
                    <div className="text-3xl font-bold">★ {selectedBook.rating}</div>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">My Notes</h3>
                  <p className="text-base leading-relaxed p-4 bg-accent/30 rounded-xl border border-input/20">
                    {selectedBook.notes}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl">
                    Edit Book
                  </button>
                  <button
                    onClick={() => setSelectedBook(null)}
                    className="px-6 py-3 border border-input/50 rounded-xl text-sm font-semibold hover:bg-accent transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        .writing-mode-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .book-container {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .book-spine,
        .book-face {
          backface-visibility: hidden;
          transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1), opacity 500ms ease, filter 500ms ease;
        }

        .book-face {
          transform-origin: left center;
          transform: rotateY(-95deg);
          filter: brightness(0.85);
        }

        .book-container:hover .book-spine {
          transform: rotateY(75deg);
          opacity: 0.18;
          filter: brightness(0.7);
        }

        .book-container:hover .book-face {
          transform: rotateY(0deg) translateX(6px);
          filter: brightness(1);
        }
      `}</style>
    </div>
  )
}
