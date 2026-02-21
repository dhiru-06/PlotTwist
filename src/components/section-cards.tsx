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
  const publicUsername = username || "reader"
  const publicShelfUrl = `plottwist.tech/@${publicUsername}`

  useEffect(() => {
    const ensureProfile = async () => {
      if (!user) {
        setLoadingUsername(false)
        return
      }

      setLoadingUsername(true)
      const preferredEmail = getPreferredEmail(user)
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
            ? baseUsername
            : `${baseUsername.slice(0, 26)}_${attempt}`

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
          setUsername(baseUsername)
          setDraftUsername(baseUsername)
          setLoadingUsername(false)
          return
        }
      }

      toast.error("Could not create a unique username")
      setUsername(baseUsername)
      setDraftUsername(baseUsername)
      setLoadingUsername(false)
    }

    ensureProfile()
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

      setCheckingUsername(true)

      const [{ data: exactData, error: exactError }, { data: suggestionsData, error: suggestionsError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id")
          .eq("username", normalized)
          .neq("id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("username")
          .ilike("username", `${normalized}%`)
          .neq("id", user.id)
          .limit(6),
      ])

      setCheckingUsername(false)

      if (exactError || suggestionsError) {
        setUsernameAvailable(null)
        setUsernameSuggestions([])
        return
      }

      setUsernameAvailable(!exactData)
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 lg:px-6 w-full min-h-screen md:min-h-[60vh]">
      <div className="min-h-[50vh] md:min-h-full flex flex-col">
        <CardHeader className="flex-1 flex flex-col justify-between pb-0">
          <div>
            <CardTitle className="text-6xl font-bold mb-6 leading-tight text-foreground tracking-tight">
              Your reading life,<br />arranged like a gallery.
            </CardTitle>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-sm font-light">
              Search for a book, add a rating and a note, then place it on a shelf. Share a clean, custom link in your bio — or keep it private.
            </p>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-stretch gap-4 mt-auto">
          <BookSearch />
          <div className="grid grid-cols-3 gap-3">
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
      <div className="min-h-[50vh] md:min-h-full flex flex-col">
        <div className="flex-1 p-6 flex flex-col">
          <Card className="bg-card border border-input rounded-2xl p-8 flex flex-col flex-1">
            <div className="flex flex-row items-start justify-between mb-6">
              <div>
                <h2 className="text-l text-muted-foreground tracking-tight mb-2">Your link</h2>
                <p className="text-2xl font-bold tracking-tight">
                  {loadingUsername ? "plottwist.tech/@..." : publicShelfUrl}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={openUsernameModal}
                  className="px-3 py-1.5 text-xs font-medium text-foreground border border-input rounded-lg hover:bg-accent transition-colors whitespace-nowrap"
                >
                  Edit Username →
                </button>
                <button
                  onClick={() => navigate("/shelf")}
                  className="px-3 py-1.5 text-xs font-medium text-foreground border border-input rounded-lg hover:bg-accent transition-colors whitespace-nowrap">
                  Preview →
                </button>
              </div>
            </div>
            <div className="w-full h-56 bg-gradient-to-br from-amber-100 via-orange-100 to-purple-200 rounded-xl flex items-center justify-center mb-8 overflow-hidden">
              <img
                src={bookStackImage}
                alt="Book Stack"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-around mt-auto pt-8 gap-3">
              <div className="flex-1 p-4 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-3xl font-bold tracking-tight">1</div>
                <div className="text-xs text-muted-foreground mt-2">Books</div>
              </div>
              <div className="flex-1 p-4 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-3xl font-bold tracking-tight">5</div>
                <div className="text-xs text-muted-foreground mt-2">Avg rating</div>
              </div>
              <div className="flex-1 p-4 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-3xl font-bold tracking-tight">3</div>
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
              <h3 className="text-lg font-semibold">Choose your username</h3>
              <button
                type="button"
                onClick={() => setIsUsernameModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <p className="text-muted-foreground mb-3 text-sm">
              We use text before <span className="font-medium">@</span> from your email for the first username. You can change it anytime.
            </p>

            <Input
              value={draftUsername}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setDraftUsername(event.target.value)
              }
              placeholder="Search username"
            />

            <div className="mt-2 min-h-5 text-xs">
              {normalizeUsername(draftUsername).length < 3 ? (
                <p className="text-muted-foreground">Username must be at least 3 characters.</p>
              ) : checkingUsername ? (
                <p className="text-muted-foreground">Checking availability...</p>
              ) : usernameAvailable === true ? (
                <p className="text-green-600">@{normalizeUsername(draftUsername)} is available</p>
              ) : usernameAvailable === false ? (
                <p className="text-destructive">@{normalizeUsername(draftUsername)} is already taken</p>
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
