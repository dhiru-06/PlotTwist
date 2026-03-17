import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export function Landing() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [scrollY, setScrollY] = useState(0)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const observerRefs = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-animate-id")
            if (id) setVisibleSections((prev) => new Set([...prev, id]))
          }
        })
      },
      { threshold: 0.15 }
    )
    observerRefs.current.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  function animateRef(id: string) {
    return (el: HTMLElement | null) => {
      if (el) {
        el.setAttribute("data-animate-id", id)
        observerRefs.current.set(id, el)
      }
    }
  }

  function fadeUp(id: string, delay = 0): React.CSSProperties {
    const visible = visibleSections.has(id)
    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
    }
  }

  useEffect(() => {
    if (!loading && user) {
      navigate("/home", { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  function handleGetStarted() {
    navigate("/sign-in")
  }

  const features = [
    {
      icon: "📚",
      title: "Shelve your reads",
      description: "Organise books into custom shelves — Reading, Finished, Want to Read — however your mind works.",
    },
    {
      icon: "⭐",
      title: "Rate & reflect",
      description: "Give each book a rating and jot down a personal note while the story is still fresh.",
    },
    {
      icon: "🔗",
      title: "Share your library",
      description: "Every shelf gets a public link. Share your taste with friends, followers, or the world.",
    },
    {
      icon: "🎨",
      title: "Make it yours",
      description: "Choose a theme, write a bio, add social links. Your shelf, your personality.",
    },
  ]

  const steps = [
    { number: "01", title: "Sign in with Google", description: "One click, no forms." },
    { number: "02", title: "Search & add books", description: "Find any book and drop it on a shelf." },
    { number: "03", title: "Rate and note", description: "Leave a star rating and a private thought." },
    { number: "04", title: "Share your link", description: "Send your shelf URL to anyone." },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      <style>{`
        @keyframes hero-fade-in {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes badge-pop {
          0%   { opacity: 0; transform: scale(0.85); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.28; }
        }
        @keyframes book-hover-in {
          from { opacity: 0; transform: translateY(20px) scaleX(0.9); }
          to   { opacity: 1; transform: translateY(0) scaleX(1); }
        }
        .hero-title  { animation: hero-fade-in 0.9s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .hero-sub    { animation: hero-fade-in 0.9s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .hero-cta    { animation: hero-fade-in 0.9s cubic-bezier(0.22,1,0.36,1) 0.6s both; }
        .hero-badge  { animation: badge-pop   0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .glow-blob   { animation: glow-pulse 6s ease-in-out infinite; }
        .floating    { animation: float 5s ease-in-out infinite; }
        .book-spine  { animation: book-hover-in 0.5s ease both; }
      `}</style>

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrollY > 40 ? "oklch(1 0 0 / 90%)" : "transparent",
          backdropFilter: scrollY > 40 ? "blur(16px)" : "none",
          borderBottom: scrollY > 40 ? "1px solid oklch(0.92 0.004 286.32)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-violet-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
            ✦ PlotTwist
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGetStarted}
              className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[88svh] md:min-h-screen flex items-center justify-center px-5 md:px-6 pt-16 md:pt-20">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="glow-blob absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/15 rounded-full blur-3xl" />
          <div className="glow-blob absolute top-1/3 left-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" style={{ animationDelay: "2s" }} />
          <div className="glow-blob absolute top-1/2 right-1/4 w-56 h-56 bg-pink-500/10 rounded-full blur-3xl" style={{ animationDelay: "4s" }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest mb-6 md:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Your reading life, beautifully organised
          </div>

          <h1 className="hero-title text-4xl md:text-7xl font-bold leading-[1.08] tracking-tight mb-5 md:mb-6">
            Your bookshelf,{" "}
            <span className="bg-gradient-to-r from-purple-600 via-violet-500 to-pink-500 bg-clip-text text-transparent">
              shared with the world
            </span>
          </h1>

          <p className="hero-sub text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-7 md:mb-10 leading-relaxed">
            PlotTwist lets you build a beautiful public library of the books you've read, loved, and want to explore — then share it with a single link.
          </p>

          <div className="hero-cta flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleGetStarted}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5"
            >
              Build your shelf
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>

            <a
              href="/dmajor"
              className="px-8 py-4 rounded-2xl border border-input hover:bg-accent text-sm font-semibold transition-all text-muted-foreground hover:text-foreground"
            >
              See a live shelf example
            </a>
          </div>

          <p className="hero-cta mt-5 text-xs text-muted-foreground">No credit card. No nonsense. Just books.</p>
        </div>
      </section>

      {/* Book shelf visual mockup */}
      <section className="py-8 md:py-12 px-5 md:px-6 overflow-hidden" ref={animateRef("mockup")}>
        <div className="max-w-5xl mx-auto" style={fadeUp("mockup")}>
          <div className="relative rounded-3xl border border-input/50 bg-gradient-to-br from-amber-50 via-stone-50 to-neutral-100 p-8 shadow-2xl overflow-hidden floating">
            {/* Fake shelf header */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <div className="ml-4 px-3 py-1 rounded-full bg-white/60 border border-input/30 text-xs text-muted-foreground font-mono">
                plottwist.tech/yourusername
              </div>
            </div>

            {/* Fake books row */}
            <div className="flex items-end gap-2 px-4 pb-4">
              {[
                { h: 208, hue: 280, title: "Dune" },
                { h: 192, hue: 220, title: "The Alchemist" },
                { h: 224, hue: 350, title: "1984" },
                { h: 176, hue: 160, title: "Atomic Habits" },
                { h: 216, hue: 30, title: "Sapiens" },
                { h: 200, hue: 200, title: "Project Hail Mary" },
                { h: 208, hue: 120, title: "Deep Work" },
                { h: 184, hue: 310, title: "The Martian" },
                { h: 220, hue: 55, title: "Thinking Fast" },
                { h: 196, hue: 180, title: "LOTR" },
                { h: 212, hue: 260, title: "Meditations" },
                { h: 188, hue: 15, title: "Born a Crime" },
              ].map((book, i) => (
                <div
                  key={i}
                  className="book-spine relative flex-shrink-0 w-10 rounded-sm shadow-lg overflow-hidden cursor-pointer hover:-translate-y-3 transition-transform duration-300"
                  style={{
                    height: book.h,
                    animationDelay: `${i * 60}ms`,
                    background: `linear-gradient(135deg, hsl(${book.hue} 65% 50%), hsl(${(book.hue + 30) % 360} 65% 35%))`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/60" />
                  <div className="absolute inset-0 flex items-center justify-center px-1">
                    <span
                      className="text-white font-bold text-[9px] text-center leading-tight"
                      style={{ writingMode: "vertical-rl", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                    >
                      {book.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Shelf surface */}
            <div className="h-3 bg-gradient-to-b from-stone-300 to-stone-400 rounded-sm shadow-inner mx-4" />

            {/* Overlay glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/20 pointer-events-none rounded-3xl" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 md:py-24 px-5 md:px-6" ref={animateRef("features")}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 md:mb-16" style={fadeUp("features")}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">Why PlotTwist</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Built for people who{" "}
              <span className="bg-gradient-to-r from-purple-600 via-violet-500 to-pink-500 bg-clip-text text-transparent">
                love books
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                ref={animateRef(`feature-${i}`)}
                style={fadeUp(`feature-${i}`, i * 100)}
                className="group p-8 rounded-3xl border border-input/50 bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 md:py-24 px-5 md:px-6 bg-gradient-to-b from-transparent via-primary/3 to-transparent" ref={animateRef("steps")}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 md:mb-16" style={fadeUp("steps")}>
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">Simple by design</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <div
                key={step.number}
                ref={animateRef(`step-${i}`)}
                style={fadeUp(`step-${i}`, i * 120)}
                className="relative text-center"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] right-[-calc(50%-2rem)] h-px bg-gradient-to-r from-border to-transparent" />
                )}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm mb-4 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  {step.number}
                </div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-32 px-5 md:px-6" ref={animateRef("cta")}>
        <div className="max-w-3xl mx-auto text-center" style={fadeUp("cta")}>
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-3xl" />
            <div className="relative px-6 md:px-16 py-10 md:py-16 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Ready to build your shelf?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Join readers who track their literary journey on PlotTwist.
              </p>
              <button
                onClick={handleGetStarted}
                className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 hover:-translate-y-0.5"
              >
                Get started - it's free
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-input/50 py-6 md:py-8 px-5 md:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
            ✦ PlotTwist
          </span>
          <span>Made with ❤️ by <a href="https://www.linkedin.com/in/dheerajdommaraju8526b8165/" target="_blank" rel="noopener noreferrer">Dheeraj</a></span>
          <p className="text-xs text-muted-foreground">
            Your library. Your story.
          </p>
        </div>
      </footer>
    </div>
  )
}
