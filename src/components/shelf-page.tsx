import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"

interface Book {
  id: string
  title: string
  author: string
  hue: number
  rating: number | null
  notes: string | null
  cover_url: string | null
  section_id: string
  section_name: string
}

function normalizeCoverUrl(url: string | null) {
  if (!url) return null
  return url.replace(/^http:\/\//i, "https://")
}

function canExtractImageHue(url: string) {
  try {
    const parsed = new URL(url)
    const blockedHosts = new Set(["books.google.com", "books.googleusercontent.com"])
    return !blockedHosts.has(parsed.hostname.toLowerCase())
  } catch {
    return false
  }
}

function stringToHue(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }

  return Math.abs(hash) % 360
}

function rgbToHue(r: number, g: number, b: number) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255

  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  if (delta === 0) return 220

  let hue = 0
  if (max === rn) {
    hue = ((gn - bn) / delta) % 6
  } else if (max === gn) {
    hue = (bn - rn) / delta + 2
  } else {
    hue = (rn - gn) / delta + 4
  }

  const normalized = Math.round(hue * 60)
  return normalized < 0 ? normalized + 360 : normalized
}

async function extractImageHue(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = "anonymous"

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(null)
          return
        }

        const sampleSize = 24
        canvas.width = sampleSize
        canvas.height = sampleSize
        ctx.drawImage(image, 0, 0, sampleSize, sampleSize)

        const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize)
        let r = 0
        let g = 0
        let b = 0
        let count = 0

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3]
          if (alpha < 40) continue
          r += data[i]
          g += data[i + 1]
          b += data[i + 2]
          count += 1
        }

        if (count === 0) {
          resolve(null)
          return
        }

        resolve(rgbToHue(Math.round(r / count), Math.round(g / count), Math.round(b / count)))
      } catch {
        resolve(null)
      }
    }

    image.onerror = () => resolve(null)
    image.src = url
  })
}

type ShelfSection = {
  id: string
  name: string
  books: Book[]
}

interface SocialLink {
  platform: string
  url: string
  icon: string
}

type ShelfCachePayload = {
  savedAt: number
  profileUsername: string
  bio: string
  theme: "light" | "vintage"
  bookCount: number
  avgRating: number | null
  shelves: ShelfSection[]
  socialLinks: SocialLink[]
}

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: "Twitter", url: "", icon: "𝕏" },
  { platform: "Instagram", url: "", icon: "📷" },
  { platform: "LinkedIn", url: "", icon: "🔗" },
]

function getShelfCacheKey(isPublicView: boolean, username: string, userId?: string) {
  return isPublicView
    ? `plottwist:shelf-cache:public:${username.toLowerCase()}`
    : `plottwist:shelf-cache:private:${userId ?? "guest"}`
}

function readShelfCache(key: string): ShelfCachePayload | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ShelfCachePayload
    if (!parsed || typeof parsed.savedAt !== "number") return null
    return parsed
  } catch {
    return null
  }
}

function writeShelfCache(key: string, payload: Omit<ShelfCachePayload, "savedAt">) {
  try {
    const value: ShelfCachePayload = {
      ...payload,
      savedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore cache write failures.
  }
}

const THEMES = {
  light: {
    background: "from-amber-50 via-stone-50 to-neutral-100",
    shelf: "from-stone-300 to-stone-400",
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
  const { user } = useAuth()
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileProfile, setShowMobileProfile] = useState(false)
  const [theme, setTheme] = useState<"light" | "vintage">("light")
  const [hoveredBook, setHoveredBook] = useState<{ shelfIndex: number; bookIndex: number } | null>(null)
  const [bio, setBio] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [profileUsername, setProfileUsername] = useState(username)
  const [bookCount, setBookCount] = useState(0)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [shelves, setShelves] = useState<ShelfSection[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [isShelvesLoading, setIsShelvesLoading] = useState(false)
  const [imageHueMap, setImageHueMap] = useState<Record<string, number>>({})
  const [shelfScrollState, setShelfScrollState] = useState<
    Record<number, { canScrollLeft: boolean; canScrollRight: boolean }>
  >({})
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(DEFAULT_SOCIAL_LINKS)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const shelfRowRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const copyResetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!user && !isPublicView) return

    async function loadProfile() {
      console.log("[ShelfPage] Loading profile:", { username, isPublicView, userId: user?.id })
      setIsShelvesLoading(true)

      const cacheKey = getShelfCacheKey(isPublicView, username, user?.id)
      const cached = readShelfCache(cacheKey)

      if (cached) {
        setProfileUsername(cached.profileUsername || username)
        setBio(cached.bio ?? "")
        setTheme(cached.theme)
        setBookCount(cached.bookCount ?? 0)
        setAvgRating(cached.avgRating ?? null)
        setShelves(cached.shelves ?? [])
        setSocialLinks(cached.socialLinks?.length ? cached.socialLinks : DEFAULT_SOCIAL_LINKS)
        setShelfScrollState({})
        setIsShelvesLoading(false)
      }

      let profileId: string | null = user?.id ?? null
      let publicProfileUsername = username
      let publicBio = ""
      let publicTheme: "light" | "vintage" | null = null

      if (isPublicView || !user) {
        const { data: publicProfile } = await supabase
          .from("profiles")
          .select("id, username, bio, theme")
          .ilike("username", username)
          .maybeSingle()

        console.log("[ShelfPage] Public profile query result:", { username, publicProfile })

        if (!publicProfile?.id) {
          console.log("[ShelfPage] No profile found for username:", username)
          setShelves([])
          setBookCount(0)
          setAvgRating(null)
          setIsShelvesLoading(false)
          return
        }

        profileId = publicProfile.id
        publicProfileUsername = publicProfile.username ?? username
        publicBio = publicProfile.bio ?? ""
        if (publicProfile.theme === "light" || publicProfile.theme === "vintage") {
          publicTheme = publicProfile.theme
        }
      }

      if (!profileId) {
        setIsShelvesLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, theme")
        .eq("id", profileId)
        .maybeSingle()

      const resolvedUsername = profile?.username ?? publicProfileUsername
      const resolvedBio = profile?.bio ?? publicBio
      const resolvedTheme =
        profile?.theme === "light" || profile?.theme === "vintage"
          ? profile.theme
          : (publicTheme ?? "light")

      const { data: books } = await supabase
        .from("section_books")
        .select("id, section_id, title, author, cover_url, rating, notes, sort_order")
        .eq("profile_id", profileId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })

      const { data: sections } = await supabase
        .from("sections")
        .select("id, name, sort_order")
        .eq("profile_id", profileId)
        .order("sort_order", { ascending: true })

      console.log("[ShelfPage] Loaded data:", { booksCount: books?.length, sectionsCount: sections?.length, profileId })

      const nextBookCount = (books ?? []).length
      const rated = (books ?? []).filter((b: { rating: number | null }) => b.rating != null)
      const nextAvgRating =
        rated.length > 0
          ? Math.round(
            (rated.reduce((sum: number, b: { rating: number }) => sum + b.rating, 0) / rated.length) * 10
          ) / 10
          : null

      const sectionOrder = (sections ?? []).map((section: { id: string; name: string }) => section)
      const grouped: ShelfSection[] = sectionOrder.map((section: { id: string; name: string }, sectionIndex: number) => {
        const sectionBooks = (books ?? [])
          .filter((book: { section_id: string }) => book.section_id === section.id)
          .map((book: {
            id: string
            section_id: string
            title: string
            author: string | null
            cover_url: string | null
            rating: number | null
            notes: string | null
          }, bookIndex: number) => ({
            id: book.id,
            section_id: book.section_id,
            section_name: section.name,
            title: book.title,
            author: book.author ?? "Unknown Author",
            cover_url: normalizeCoverUrl(book.cover_url),
            rating: book.rating,
            notes: book.notes,
            hue: stringToHue(`${book.cover_url ?? ""}-${book.title}-${section.name}-${sectionIndex}-${bookIndex}`),
          }))

        return {
          id: section.id,
          name: section.name,
          books: sectionBooks,
        }
      })

      const nextShelves = grouped
      setProfileUsername(resolvedUsername)
      setBio(resolvedBio)
      setTheme(resolvedTheme)
      setBookCount(nextBookCount)
      setAvgRating(nextAvgRating)
      setShelves(nextShelves)
      setShelfScrollState({})

      const { data: links } = await supabase
        .from("profile_social_links")
        .select("platform, url")
        .eq("profile_id", profileId)
        .order("sort_order", { ascending: true })

      if (links && links.length > 0) {
        setSocialLinks((prev) =>
          prev.map((existing) => {
            const saved = links.find(
              (link: { platform: string; url: string }) =>
                link.platform.toLowerCase() === existing.platform.toLowerCase()
            )
            return saved ? { ...existing, url: saved.url } : existing
          })
        )
      }

      const mergedSocialLinks = DEFAULT_SOCIAL_LINKS.map((existing) => {
        const saved = (links ?? []).find(
          (link: { platform: string; url: string }) =>
            link.platform.toLowerCase() === existing.platform.toLowerCase()
        )
        return saved ? { ...existing, url: saved.url } : existing
      })

      setSocialLinks(mergedSocialLinks)

      writeShelfCache(cacheKey, {
        profileUsername: resolvedUsername,
        bio: resolvedBio,
        theme: resolvedTheme,
        bookCount: nextBookCount,
        avgRating: nextAvgRating,
        shelves: nextShelves,
        socialLinks: mergedSocialLinks,
      })

      setIsShelvesLoading(false)
    }

    void loadProfile()
  }, [isPublicView, user, username, refreshKey])

  useEffect(() => {
    function handleShelfDataChanged() {
      setRefreshKey((prev) => prev + 1)
    }

    window.addEventListener("section-books-changed", handleShelfDataChanged)
    window.addEventListener("sections-changed", handleShelfDataChanged)

    return () => {
      window.removeEventListener("section-books-changed", handleShelfDataChanged)
      window.removeEventListener("sections-changed", handleShelfDataChanged)
    }
  }, [])

  async function handleSaveSettings() {
    if (!user) {
      toast.error("Please sign in to save settings")
      return
    }

    setIsSaving(true)

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        bio: bio.trim() || null,
        theme,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (profileError) {
      setIsSaving(false)
      toast.error("Failed to save profile")
      return
    }

    const { error: deleteError } = await supabase
      .from("profile_social_links")
      .delete()
      .eq("profile_id", user.id)

    if (deleteError) {
      setIsSaving(false)
      toast.error("Failed to update social links")
      return
    }

    const linksToInsert = socialLinks
      .filter((link) => link.url.trim())
      .map((link, index) => ({
        profile_id: user.id,
        platform: link.platform,
        url: link.url.trim(),
        sort_order: index,
      }))

    if (linksToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("profile_social_links")
        .insert(linksToInsert)

      if (insertError) {
        setIsSaving(false)
        toast.error("Failed to save social links")
        return
      }
    }

    setIsSaving(false)
    toast.success("Settings saved")
    setShowSettings(false)
  }

  const currentTheme = THEMES[theme]

  const updateShelfScrollState = (shelfIndex: number) => {
    const row = shelfRowRefs.current[shelfIndex]
    if (!row) return

    const hasOverflow = row.scrollWidth > row.clientWidth + 1
    const canScrollLeft = row.scrollLeft > 0
    const canScrollRight = row.scrollLeft + row.clientWidth < row.scrollWidth - 1

    setShelfScrollState((prev) => ({
      ...prev,
      [shelfIndex]: {
        canScrollLeft: hasOverflow && canScrollLeft,
        canScrollRight: hasOverflow && canScrollRight,
      },
    }))
  }

  const scrollShelf = (shelfIndex: number, direction: "left" | "right") => {
    const row = shelfRowRefs.current[shelfIndex]
    if (!row) return

    row.scrollBy({
      left: direction === "left" ? -280 : 280,
      behavior: "smooth",
    })
  }

  useEffect(() => {
    const onResize = () => {
      shelves.forEach((_, shelfIndex) => updateShelfScrollState(shelfIndex))
    }

    onResize()
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
    }
  }, [shelves])

  useEffect(() => {
    const urls = Array.from(
      new Set(
        shelves
          .flatMap((shelf) => shelf.books.map((book) => book.cover_url))
          .filter((url): url is string => Boolean(url))
      )
    ).filter((url) => imageHueMap[url] == null && canExtractImageHue(url))

    if (urls.length === 0) return

    let isCancelled = false

    async function loadImageHues() {
      const results = await Promise.all(
        urls.map(async (url) => ({
          url,
          hue: await extractImageHue(url),
        }))
      )

      if (isCancelled) return

      setImageHueMap((prev) => {
        const next = { ...prev }
        results.forEach(({ url, hue }) => {
          if (hue != null) {
            next[url] = hue
          }
        })
        return next
      })
    }

    void loadImageHues()

    return () => {
      isCancelled = true
    }
  }, [imageHueMap, shelves])

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current != null) {
        window.clearTimeout(copyResetTimerRef.current)
      }
    }
  }, [])

  const shareSlug = encodeURIComponent((profileUsername || username).trim())
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${shareSlug}`
    : `https://plottwist.tech/${shareSlug}`

  const copyLinkToClipboard = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const textArea = document.createElement("textarea")
        textArea.value = shareUrl
        textArea.setAttribute("readonly", "")
        textArea.style.position = "absolute"
        textArea.style.left = "-9999px"
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }

      setIsLinkCopied(true)
      toast.success("Shelf link copied")

      if (copyResetTimerRef.current != null) {
        window.clearTimeout(copyResetTimerRef.current)
      }

      copyResetTimerRef.current = window.setTimeout(() => {
        setIsLinkCopied(false)
      }, 1800)
    } catch {
      toast.error("Could not copy link")
    }
  }

  const profileCard = (
    <Card className="bg-gradient-to-br from-white/80 to-white/40 dark:from-neutral-800/80 dark:to-neutral-900/40 backdrop-blur-xl border border-input/50 rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg flex-shrink-0">
          {profileUsername.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2
            className="truncate text-2xl font-bold bg-gradient-to-br from-purple-600 to-pink-500 bg-clip-text text-transparent"
            title={`@${profileUsername}`}
          >
            @{profileUsername}
          </h2>
        </div>
      </div>
      {bio && (
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          {bio}
        </p>
      )}
      {!bio && (
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Welcome to my digital library.
        </p>
      )}

      <div className="space-y-3 pt-4 border-t border-input/30">
        <div className="flex items-center justify-between p-2 rounded-xl bg-accent/50">
          <span className="text-xs font-medium text-muted-foreground">Books</span>
          <span className="font-bold text-lg text-600">{bookCount}</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded-xl bg-accent/50">
          <span className="text-xs font-medium text-muted-foreground">Avg Rating</span>
          <span className="font-bold text-lg text-600">{avgRating != null ? `${avgRating} ★` : "— ★"}</span>
        </div>
      </div>

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
  )

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentTheme.background}`}>
      {/* Header - hidden in public view */}
      {!isPublicView && (
        <header className="backdrop-blur-sm bg-background/80 border-b border-input/50 px-8 py-5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-sm font-medium hover:text-foreground/80 transition-all hover:gap-3"
            >
              ← Back
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-input hover:bg-accent text-sm font-medium transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Customize</span>
            </button>
            <button
              onClick={copyLinkToClipboard}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-input hover:bg-accent text-sm font-medium transition-all"
              aria-label="Copy public shelf link"
              title={shareUrl}
            >
              <span>{isLinkCopied ? "Copied" : "Share"}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </header>
      )}

      {showMobileProfile && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setShowMobileProfile(false)}
        >
          <div
            className="absolute left-0 top-0 h-full w-[84%] max-w-sm bg-background border-r border-input p-4 overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Profile</h3>
              <button
                onClick={() => setShowMobileProfile(false)}
                className="h-8 w-8 rounded-md hover:bg-accent"
                aria-label="Close profile panel"
              >
                ✕
              </button>
            </div>
            {profileCard}
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {!isPublicView && showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
          <Card className="bg-background max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Customize Your Shelf</h2>
                <button onClick={() => setShowSettings(false)} className="text-2xl hover:text-foreground/70">&times;</button>
              </div>

              {/* Theme Selection */}
              <div className="space-y-3">
                <label className="font-semibold">Theme</label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(THEMES) as Array<keyof typeof THEMES>).map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => setTheme(themeName)}
                      className={`p-4 rounded-lg border-2 transition-all capitalize ${theme === themeName ? "border-purple-500 bg-purple-50 dark:bg-purple-950" : "border-input hover:border-purple-300"
                        }`}
                    >
                      <div className={`h-16 rounded bg-gradient-to-br ${THEMES[themeName].background} mb-2`}></div>
                      {themeName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-3">
                <label className="font-semibold">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about your reading life..."
                  rows={4}
                  maxLength={300}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/300</p>
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
                      className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </Card>
        </div>
      )}

      <div className="md:flex">
        {/* Left Sidebar - Profile */}
        <aside className="hidden md:block fixed left-0 top-[77px] bottom-0 w-80 border-r border-input/30 p-6 backdrop-blur-sm bg-background/30 overflow-y-auto">
          {profileCard}
        </aside>

        {/* Main Content - Bookshelf */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full md:ml-80">
          <div className="md:hidden mb-4 flex items-center justify-between gap-3">
            <button
              onClick={() => setShowMobileProfile(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background/90 hover:bg-accent transition-colors"
              aria-label="Open profile panel"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-sm font-medium">Profile</span>
            </button>

            <div className="rounded-full border border-input/60 bg-background/70 px-3 py-1.5 backdrop-blur-sm shadow-sm">
              <p className="text-center">
                <a href="https://plottwist.tech" rel="noopener noreferrer">
                <span className="text-s font-semibold bg-gradient-to-r from-purple-600 via-violet-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                  ✦ PlotTwist
                </span>
                </a>
              </p>
            </div>
          </div>

          <div className="mb-8 hidden items-center justify-center md:flex">
            <div className="rounded-full border border-input/60 bg-background/70 px-5 py-2 backdrop-blur-sm shadow-sm">
              <p className="text-center">
                <a href="https://plottwist.tech" rel="noopener noreferrer">
                <span className="text-base font-bold bg-gradient-to-r from-purple-600 via-violet-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
                ✦ PlotTwist
              </span>
              </a></p>
            </div>
          </div>

          {/* <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">A glimpse of my book collection</h2>
          </div> */}

          {/* Shelves stacked vertically */}
          <div className="space-y-16">
            {isShelvesLoading ? (
              <div className="text-sm text-muted-foreground">Loading shelves...</div>
            ) : shelves.length === 0 ? (
              <div className="text-sm text-muted-foreground">No books on this shelf yet.</div>
            ) : shelves.map((shelf, shelfIndex) => (
              <div key={shelfIndex} className="relative">
                {/* Shelf */}
                <div className="relative">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{shelf.name}</p>
                  </div>

                  {/* Books on this shelf */}
                  <div className="relative pb-6 overflow-visible">
                    {shelfScrollState[shelfIndex]?.canScrollLeft && (
                      <button
                        type="button"
                        onClick={() => scrollShelf(shelfIndex, "left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/90 border border-input shadow-sm hover:bg-accent"
                        aria-label="Scroll books left"
                      >
                        ←
                      </button>
                    )}
                    {shelfScrollState[shelfIndex]?.canScrollRight && (
                      <button
                        type="button"
                        onClick={() => scrollShelf(shelfIndex, "right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-background/90 border border-input shadow-sm hover:bg-accent"
                        aria-label="Scroll books right"
                      >
                        →
                      </button>
                    )}
                    <div
                      ref={(element) => {
                        shelfRowRefs.current[shelfIndex] = element
                      }}
                      onScroll={() => updateShelfScrollState(shelfIndex)}
                      className="flex gap-3 items-end justify-start overflow-x-auto scroll-smooth px-10 md:px-0"
                      style={{ willChange: "transform", perspective: "1000px" }}
                    >
                      {shelf.books.map((book, index) => (
                        (() => {
                          const isHovered = hoveredBook?.shelfIndex === shelfIndex && hoveredBook?.bookIndex === index
                          const resolvedHue = book.cover_url ? (imageHueMap[book.cover_url] ?? book.hue) : book.hue

                          return (
                            <div
                              key={book.id}
                              onMouseEnter={() =>
                                setHoveredBook({ shelfIndex: shelfIndex, bookIndex: index })
                              }
                              onMouseLeave={() => setHoveredBook(null)}
                              onClick={() => setSelectedBook(book)}
                              className={`book-container cursor-pointer relative ${isHovered ? "z-50" : "z-10"
                                }`}
                              style={{
                                perspective: "2000px",
                                animationDelay: `${index * 100}ms`,
                                transform: (() => {
                                  if (!hoveredBook || hoveredBook.shelfIndex !== shelfIndex) {
                                    return "translateX(0)"
                                  }

                                  const diff = index - hoveredBook.bookIndex

                                  if (diff === 0) {
                                    return "scale(1.05)" // hovered book
                                  }

                                  const direction = diff > 0 ? 1 : -1
                                  const distance = Math.abs(diff)

                                  // 🔥 tuned values (clean + visible)
                                  const shift = Math.max(0, 180 - distance * 40)

                                  return `translateX(${direction * shift}px)`
                                })(),
                              }}
                            >
                              {/* 3D Book - spine forward by default, face rotates in on hover */}
                              <div className="relative w-10 h-52" style={{ transformStyle: "preserve-3d" }}>
                                {/* Book Spine (default visible) */}
                                <div
                                  className="book-spine relative w-10 h-52 rounded-sm shadow-lg overflow-hidden"
                                  style={{
                                    backgroundImage: book.cover_url
                                      ? `url('${book.cover_url}')`
                                      : `linear-gradient(135deg, hsl(${resolvedHue} 72% 56%), hsl(${(resolvedHue + 28) % 360} 72% 36%))`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                    boxShadow: "4px 4px 12px rgba(0,0,0,0.3), inset -2px 0 4px rgba(0,0,0,0.2)",
                                  }}
                                >
                                  {/* Dark overlay */}
                                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/70"></div>

                                  {/* Spine text */}
                                  <div className="absolute inset-0 flex items-center justify-center px-0.5">
                                    <div className="writing-mode-vertical text-gray-100 font-bold text-[12px] px-0.5 text-center" style={{
                                      textShadow: "0 0 12px rgba(0,0,0,2), 2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.7)",
                                      wordBreak: "break-word",
                                      lineHeight: "1.5",
                                      letterSpacing: "0.5px",
                                    }}>
                                      {book.title}
                                    </div>
                                  </div>
                                </div>

                                {/* Front Cover (rotates into view on hover) */}
                                <div
                                  className="book-face absolute top-0 left-[9px] w-32 h-52 shadow-2xl overflow-hidden"
                                  style={{
                                    backgroundImage: book.cover_url
                                      ? `url('${book.cover_url}')`
                                      : `linear-gradient(135deg, hsl(${resolvedHue} 72% 56%), hsl(${(resolvedHue + 28) % 360} 72% 36%))`,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
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
                                </div>
                              </div>
                            </div>
                          )
                        })()
                      ))}
                    </div>
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

      {/* Book Detail Drawer */}
      {selectedBook && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/55"
            onClick={() => setSelectedBook(null)}
            aria-label="Close book drawer"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border border-input bg-background p-6 shadow-2xl md:top-0 md:right-0 md:left-auto md:w-[440px] md:max-h-none md:rounded-none md:rounded-l-3xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  {selectedBook.section_name}
                </p>
                <h2 className="text-2xl font-bold leading-tight">{selectedBook.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selectedBook.author}</p>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="h-8 w-8 rounded-md hover:bg-accent"
                aria-label="Close drawer"
              >
                ✕
              </button>
            </div>

            {selectedBook.cover_url ? (
              <div className="mb-5 flex justify-center">
                <img
                  src={selectedBook.cover_url}
                  alt={selectedBook.title}
                  className="max-h-[62vh] w-auto max-w-full rounded-xl border border-input/30 shadow-lg"
                />
              </div>
            ) : (
              <div
                className="mb-5 h-44 w-full rounded-xl p-5 text-white shadow-lg"
                style={{
                  backgroundImage: `linear-gradient(135deg, hsl(${selectedBook.hue} 72% 56%), hsl(${(selectedBook.hue + 28) % 360} 72% 36%))`,
                }}
              >
                <p className="text-lg font-semibold">{selectedBook.title}</p>
                <p className="text-sm opacity-90 mt-1">{selectedBook.author}</p>
              </div>
            )}

            <div className="mb-5 rounded-xl border border-input/30 bg-accent/40 p-4">
              <p className="mb-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-primary">My Rating</p>
              <p className="text-2xl font-bold mt-1">{selectedBook.rating != null ? `${selectedBook.rating} ★` : "Not rated"}</p>
            </div>

            <div className="rounded-xl border border-input/30 bg-accent/20 p-4">
              <p className="mb-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-primary">My Thoughts</p>
              <p className="text-sm leading-relaxed">
                {selectedBook.notes?.trim() ? selectedBook.notes : "No notes yet."}
              </p>
            </div>
          </div>
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
            transition: transform 0.4s ease; /* ← THIS is critical */
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
