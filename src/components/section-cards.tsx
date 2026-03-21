import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { User } from "@supabase/supabase-js"
import { toast } from "sonner"

import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { BookSearch } from "@/components/book-search"
import bookStackImage from "@/assets/book2.png"

function normalizeUsername(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "")
  if (cleaned.length === 0) return "reader"
  return cleaned.slice(0, 30)
}

function getPreferredEmail(user: User | null): string | undefined {
  if (!user) return undefined

  const metaEmail = user.user_metadata?.email
  if (typeof metaEmail === "string" && metaEmail.includes("@")) {
    return metaEmail
  }

  if (user.email && user.email.includes("@")) {
    return user.email
  }

  const identities = (user as User & { identities?: Array<{ identity_data?: { email?: string } }> }).identities
  const identityEmail = identities?.[0]?.identity_data?.email

  if (typeof identityEmail === "string" && identityEmail.includes("@")) {
    return identityEmail
  }

  return undefined
}

function buildInitialUsername(email: string | undefined, userId: string) {
  const fromEmail = email ? email.split("@")[0] : ""
  const base = normalizeUsername(fromEmail || "reader")
  if (base.length >= 3) return base
  return `${userId.slice(0, 6)}`
}

function buildRandomDefaultUsername(userId: string) {
  const randomSuffix = Math.random().toString(36).slice(2, 8)
  const fallback = userId.slice(0, 6).toLowerCase()
  return normalizeUsername(`reader_${randomSuffix || fallback}`)
}

export function SectionCards() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [username, setUsername] = useState("")
  const [draftUsername, setDraftUsername] = useState("")
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false)
  const [loadingUsername, setLoadingUsername] = useState(true)
  const [savingUsername, setSavingUsername] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [bookCount, setBookCount] = useState(0)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [shelfCount, setShelfCount] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const publicUsername = username || "reader"
  const publicShelfUrl = `plottwist.tech/@${publicUsername}`
  const normalizedDraftUsername = normalizeUsername(draftUsername)
  const isDraftTooShort = normalizedDraftUsername.length < 3
  const isCurrentUsername = normalizedDraftUsername === username
  const avgRatingLabel = avgRating != null ? avgRating.toFixed(1) : "0.0"

  const checkUsernameInProfiles = async (candidate: string, userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", candidate)
      .neq("id", userId)
      .maybeSingle()

    if (error) {
      return { available: null as boolean | null, error: true }
    }

    return { available: !data, error: false }
  }

  useEffect(() => {
    const ensureProfile = async () => {
      if (!user) {
        setLoadingUsername(false)
        return
      }

      setLoadingUsername(true)
      const preferredEmail = getPreferredEmail(user)
      const randomDefaultUsername = buildRandomDefaultUsername(user.id)
      const baseUsername = buildInitialUsername(preferredEmail, user.id)

      setUsername((prev) => prev || baseUsername)
      setDraftUsername((prev) => prev || baseUsername)

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle()

      if (error) {
        toast.error("Failed to load username")
        setUsername(baseUsername)
        setDraftUsername(baseUsername)
        setLoadingUsername(false)
        return
      }

      if (data?.username) {
        const currentUsername = data.username
        const preferredFromEmail = normalizeUsername(preferredEmail?.split("@")[0] ?? "")

        if (currentUsername === "reader" && preferredFromEmail && preferredFromEmail !== "reader") {
          for (let attempt = 0; attempt < 10; attempt += 1) {
            const candidate = attempt === 0 ? preferredFromEmail : `${preferredFromEmail.slice(0, 26)}_${attempt}`
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ username: candidate })
              .eq("id", user.id)

            if (!updateError) {
              setUsername(candidate)
              setDraftUsername(candidate)
              setLoadingUsername(false)
              return
            }

            if (updateError.code !== "23505") break
          }
        }

        setUsername(currentUsername)
        setDraftUsername(currentUsername)
        setLoadingUsername(false)
        return
      }

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const candidate =
          attempt === 0
            ? randomDefaultUsername
            : `${randomDefaultUsername.slice(0, 26)}_${attempt}`

        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          username: candidate,
        })

        if (!insertError) {
          setUsername(candidate)
          setDraftUsername(candidate)
          setLoadingUsername(false)
          return
        }

        if (insertError.code !== "23505") {
          toast.error("Failed to create username")
          setUsername(randomDefaultUsername)
          setDraftUsername(randomDefaultUsername)
          setLoadingUsername(false)
          return
        }
      }

      toast.error("Could not create a unique username")
      setUsername(randomDefaultUsername)
      setDraftUsername(randomDefaultUsername)
      setLoadingUsername(false)
    }

    ensureProfile()
  }, [user])

  useEffect(() => {
    const loadStats = async () => {
      if (!user) {
        setBookCount(0)
        setAvgRating(null)
        setShelfCount(0)
        setLoadingStats(false)
        return
      }

      setLoadingStats(true)

      const [{ data: books, error: booksError }, { data: sections, error: sectionsError }] = await Promise.all([
        supabase
          .from("section_books")
          .select("rating")
          .eq("profile_id", user.id),
        supabase
          .from("sections")
          .select("id")
          .eq("profile_id", user.id),
      ])

      if (booksError || sectionsError) {
        setLoadingStats(false)
        return
      }

      const bookRows = books ?? []
      const ratedBooks = bookRows.filter((book: { rating: number | null }) => book.rating != null)
      const nextAvgRating =
        ratedBooks.length > 0
          ? Math.round(
            (ratedBooks.reduce((sum: number, book: { rating: number }) => sum + book.rating, 0) /
              ratedBooks.length) *
              10
          ) / 10
          : null

      setBookCount(bookRows.length)
      setAvgRating(nextAvgRating)
      setShelfCount((sections ?? []).length)
      setLoadingStats(false)
    }

    void loadStats()

    const handleStatsChanged = () => {
      void loadStats()
    }

    window.addEventListener("section-books-changed", handleStatsChanged)
    window.addEventListener("sections-changed", handleStatsChanged)

    return () => {
      window.removeEventListener("section-books-changed", handleStatsChanged)
      window.removeEventListener("sections-changed", handleStatsChanged)
    }
  }, [user])

  useEffect(() => {
    const checkAvailability = async () => {
      if (!isUsernameModalOpen || !user) return

      const normalized = normalizeUsername(draftUsername)

      if (normalized.length < 3) {
        setUsernameAvailable(null)
        setUsernameSuggestions([])
        return
      }

      if (normalized === username) {
        setUsernameAvailable(true)
        setUsernameSuggestions([])
        return
      }

      setCheckingUsername(true)

      const [{ available, error: availabilityError }, { data: suggestionsData, error: suggestionsError }] = await Promise.all([
        checkUsernameInProfiles(normalized, user.id),
        supabase
          .from("profiles")
          .select("username")
          .ilike("username", `${normalized}%`)
          .neq("id", user.id)
          .limit(6),
      ])

      setCheckingUsername(false)

      if (availabilityError || suggestionsError) {
        setUsernameAvailable(null)
        setUsernameSuggestions([])
        return
      }

      setUsernameAvailable(available)
      setUsernameSuggestions(
        (suggestionsData ?? []).map((item: { username: string }) => item.username)
      )
    }

    const timer = setTimeout(checkAvailability, 250)
    return () => clearTimeout(timer)
  }, [draftUsername, isUsernameModalOpen, user])

  const handleSaveUsername = async () => {
    if (!user) return

    const next = normalizeUsername(draftUsername)
    if (next.length < 3) {
      toast.error("Username must be at least 3 characters")
      return
    }

    setSavingUsername(true)

    const { available, error: availabilityError } = await checkUsernameInProfiles(next, user.id)

    if (availabilityError) {
      setSavingUsername(false)
      toast.error("Could not verify username availability")
      return
    }

    if (!available) {
      setSavingUsername(false)
      setUsernameAvailable(false)
      toast.error("Username is already taken")
      return
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, username: next }, { onConflict: "id" })

    setSavingUsername(false)

    if (error) {
      if (error.code === "23505") {
        toast.error("Username is already taken")
      } else {
        toast.error("Failed to update username")
      }
      return
    }

    setUsername(next)
    setDraftUsername(next)
    setIsUsernameModalOpen(false)
    toast.success("Username updated")
  }

  const openUsernameModal = () => {
    const initial = username || buildInitialUsername(getPreferredEmail(user), user?.id ?? "reader")
    setDraftUsername(initial)
    setIsUsernameModalOpen(true)
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
      <div className="flex flex-col">
        <CardHeader className="pb-2">
          <div>
            <CardTitle className="mb-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-5xl">
              Your library,<br />curated by you.
            </CardTitle>
            <p className="mb-6 max-w-md text-lg leading-relaxed text-muted-foreground lg:text-base">
              Find a book, rate it, add a note, and shelve it. Share your link anytime.
            </p>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-stretch gap-3 pt-1">
          <BookSearch />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="p-4 border border-input rounded-lg">
              <div className="text-sm font-semibold mb-1">Shelf views</div>
              <p className="text-xs text-muted-foreground">Want to Read, Currently Reading, Finished.</p>
            </div>
            <div className="p-4 border border-input rounded-lg">
              <div className="text-sm font-semibold mb-1">Ratings</div>
              <p className="text-xs text-muted-foreground">A tiny ritual that makes it yours.</p>
            </div>
            <div className="p-4 border border-input rounded-lg">
              <div className="text-sm font-semibold mb-1">Notes</div>
              <p className="text-xs text-muted-foreground">Leave a line you'll remember later.</p>
            </div>
          </div>
        </CardFooter>
      </div>
      <div className="flex flex-col">
        <div className="flex flex-1 flex-col p-2 sm:p-4 lg:p-6">
          <Card className="flex flex-1 flex-col rounded-2xl border border-input sm-card p-4 sm:p-6 lg:p-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="mb-1 text-sm tracking-tight text-muted-foreground">Your link</h2>
                <p className="truncate text-lg font-bold tracking-tight sm:text-2xl">
                  {loadingUsername ? "plottwist.tech/@..." : publicShelfUrl}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openUsernameModal}
                  className="whitespace-nowrap cursor-pointer"
                >
                  Edit Username →
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/shelf")}
                  className="whitespace-nowrap cursor-pointer"
                >
                  Preview →
                </Button>
              </div>
            </div>
            <div className="mb-6 flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-orange-100 to-purple-200 sm:h-24">
              <img
                src={bookStackImage}
                alt="Book Stack"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-auto grid grid-cols-3 gap-2 pt-1 sm:gap-3 sm:pt-1">
              <div className="flex-1 p-2 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {loadingStats ? "..." : bookCount}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Books</div>
              </div>
              <div className="flex-1 p-2 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {loadingStats ? "..." : avgRatingLabel}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Avg rating</div>
              </div>
              <div className="flex-1 p-2 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {loadingStats ? "..." : shelfCount}
                </div>
                <div className="text-xs text-muted-foreground mt-2">Shelves</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {isUsernameModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsUsernameModalOpen(false)}
        >
          <div
            className="bg-background w-full max-w-lg rounded-xl border border-input p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Search username</h3>
              <button
                type="button"
                onClick={() => setIsUsernameModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
              This becomes your public shelf link: <span className="font-medium">plottwist.tech/@username</span>. 
            </p>

            <Input
              value={draftUsername}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraftUsername(event.target.value)
              }
              placeholder="Type a username"
            />

            <div className="mt-2 min-h-5 text-xs">
              {isDraftTooShort ? (
                <p className="text-muted-foreground">Username must be at least 3 characters.</p>
              ) : checkingUsername ? (
                <p className="text-muted-foreground">Checking availability...</p>
              ) : isCurrentUsername ? (
                <p className="text-green-600">You are already using @{normalizedDraftUsername}</p>
              ) : usernameAvailable === true ? (
                <p className="text-green-600">@{normalizedDraftUsername} is available</p>
              ) : usernameAvailable === false ? (
                <p className="text-destructive">@{normalizedDraftUsername} is already taken</p>
              ) : null}
            </div>

            {usernameSuggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-muted-foreground mb-2 text-xs">Similar usernames:</p>
                <div className="flex flex-wrap gap-2">
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setDraftUsername(suggestion)}
                      className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
                    >
                      @{suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsUsernameModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveUsername}
                disabled={savingUsername || checkingUsername || usernameAvailable !== true}
              >
                {savingUsername ? "Saving..." : "Save Username"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
