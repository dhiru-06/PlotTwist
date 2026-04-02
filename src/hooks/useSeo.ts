import { useEffect } from "react"

type SeoOptions = {
  title: string
  description: string
  path?: string
  noIndex?: boolean
  ogType?: "website" | "profile"
  imagePath?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

function getSiteUrl() {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined
  if (configured && configured.trim()) {
    return configured.replace(/\/$/, "")
  }

  if (typeof window !== "undefined") {
    return window.location.origin
  }

  return "https://plottwist.tech"
}

function resolveAbsoluteUrl(siteUrl: string, value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value
  }

  return `${siteUrl}${value.startsWith("/") ? "" : "/"}${value}`
}

function getOrCreateMeta(name: string, selectorType: "name" | "property" = "name") {
  const selector = `meta[${selectorType}="${name}"]`
  let element = document.head.querySelector(selector) as HTMLMetaElement | null

  if (!element) {
    element = document.createElement("meta")
    element.setAttribute(selectorType, name)
    document.head.appendChild(element)
  }

  return element
}

export function useSeo({
  title,
  description,
  path,
  noIndex = false,
  ogType = "website",
  imagePath,
  jsonLd,
}: SeoOptions) {
  useEffect(() => {
    const siteUrl = getSiteUrl()
    const normalizedPath = path ?? (typeof window !== "undefined" ? window.location.pathname : "/")
    const canonicalUrl = `${siteUrl}${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`
    const configuredImage = (import.meta.env.VITE_OG_IMAGE_URL as string | undefined)?.trim()
    const selectedImage = imagePath ?? configuredImage ?? "/og-image.svg"
    const imageUrl = resolveAbsoluteUrl(siteUrl, selectedImage)

    document.title = title

    const descriptionMeta = getOrCreateMeta("description")
    descriptionMeta.setAttribute("content", description)

    const robotsMeta = getOrCreateMeta("robots")
    robotsMeta.setAttribute("content", noIndex ? "noindex, nofollow" : "index, follow")

    const ogTitleMeta = getOrCreateMeta("og:title", "property")
    ogTitleMeta.setAttribute("content", title)

    const ogDescriptionMeta = getOrCreateMeta("og:description", "property")
    ogDescriptionMeta.setAttribute("content", description)

    const ogTypeMeta = getOrCreateMeta("og:type", "property")
    ogTypeMeta.setAttribute("content", ogType)

    const ogUrlMeta = getOrCreateMeta("og:url", "property")
    ogUrlMeta.setAttribute("content", canonicalUrl)

    const ogImageMeta = getOrCreateMeta("og:image", "property")
    ogImageMeta.setAttribute("content", imageUrl)

    const ogImageAltMeta = getOrCreateMeta("og:image:alt", "property")
    ogImageAltMeta.setAttribute("content", `${title} preview image`)

    const twitterCardMeta = getOrCreateMeta("twitter:card")
    twitterCardMeta.setAttribute("content", "summary_large_image")

    const twitterTitleMeta = getOrCreateMeta("twitter:title")
    twitterTitleMeta.setAttribute("content", title)

    const twitterDescriptionMeta = getOrCreateMeta("twitter:description")
    twitterDescriptionMeta.setAttribute("content", description)

    const twitterImageMeta = getOrCreateMeta("twitter:image")
    twitterImageMeta.setAttribute("content", imageUrl)

    const twitterImageAltMeta = getOrCreateMeta("twitter:image:alt")
    twitterImageAltMeta.setAttribute("content", `${title} preview image`)

    let canonicalLink = document.head.querySelector("link[rel='canonical']") as HTMLLinkElement | null
    if (!canonicalLink) {
      canonicalLink = document.createElement("link")
      canonicalLink.setAttribute("rel", "canonical")
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute("href", canonicalUrl)

    const existingJsonLd = document.getElementById("plottwist-seo-jsonld")
    if (existingJsonLd) {
      existingJsonLd.remove()
    }

    if (jsonLd) {
      const script = document.createElement("script")
      script.id = "plottwist-seo-jsonld"
      script.type = "application/ld+json"
      script.text = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
  }, [description, imagePath, jsonLd, noIndex, ogType, path, title])
}
