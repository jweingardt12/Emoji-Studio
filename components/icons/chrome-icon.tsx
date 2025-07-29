import { SVGProps } from "react"

export function ChromeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="M21.17 8H12" />
      <path d="M3.95 6.06L8.54 14" />
      <path d="M10.88 21.94L15.46 14" />
    </svg>
  )
}