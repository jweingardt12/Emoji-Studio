import { Button } from "@/components/ui/button"
import { SearchX, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <div className="rounded-full bg-muted p-4">
          <SearchX className="h-10 w-10 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It might have been moved or doesn't exist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild>
            <Link href="/dashboard" className="gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="javascript:history.back()" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
