import { SlackCurlInput } from "@/components/slack-curl-input"
import { ClearLocalStorageButton } from "@/components/clear-local-storage-button"
import { FetchStatsDisplay } from "@/components/fetch-stats-display"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsIcon } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-2 py-2 sm:gap-4 sm:py-4 md:gap-6 md:py-6">
      <div className="px-2 sm:px-4 lg:px-6">
        <div className="rounded-xl bg-card border border-border shadow p-2 sm:p-4">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Settings</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Configure your emoji dashboard preferences and data sources.
            </p>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {/* Slack Integration */}
            <SlackCurlInput />
            
            {/* Data Management Grid */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Fetch Statistics */}
              <FetchStatsDisplay />
              
              {/* Storage Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Storage Management</CardTitle>
                  <CardDescription>
                    Clear all locally stored data including emoji information and settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 sm:p-4 border rounded-lg bg-muted/50">
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        This action will remove all cached emoji data, workspace information, 
                        and stored preferences. You'll need to reconnect to Slack to restore data.
                      </p>
                    </div>
                    <ClearLocalStorageButton />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
