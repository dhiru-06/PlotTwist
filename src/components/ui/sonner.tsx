import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--primary)",
          "--normal-text": "var(--primary-foreground)",
          "--normal-border": "var(--ring)",
          "--success-bg": "var(--chart-2)",
          "--success-text": "var(--primary-foreground)",
          "--success-border": "var(--ring)",
          "--info-bg": "var(--chart-3)",
          "--info-text": "var(--primary-foreground)",
          "--info-border": "var(--ring)",
          "--warning-bg": "var(--chart-4)",
          "--warning-text": "var(--primary-foreground)",
          "--warning-border": "var(--ring)",
          "--error-bg": "var(--chart-5)",
          "--error-text": "var(--primary-foreground)",
          "--error-border": "var(--ring)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
