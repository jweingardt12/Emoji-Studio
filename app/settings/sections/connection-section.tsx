"use client"

import { useState } from "react"
import { SlackCurlInput } from "@/components/slack-curl-input"
import { ChromeExtensionOption } from "@/components/chrome-extension-option"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Terminal, Zap } from "lucide-react"
import { ChromeIcon } from "@/components/icons/chrome-icon"
import { PairToMobile } from "@/components/pair-to-mobile"

interface ConnectionSectionProps {
  hasSlack: boolean
  isMobile: boolean
}

export function ConnectionSection({ hasSlack, isMobile }: ConnectionSectionProps) {
  const [isManualSetupOpen, setIsManualSetupOpen] = useState(false)
  const [isChromeExtensionOpen, setIsChromeExtensionOpen] = useState(false)
  const [isChromeExtensionConnectedOpen, setIsChromeExtensionConnectedOpen] = useState(false)

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-right-4 duration-300">
      <div>
        <h2 className="text-xl font-semibold">Connection</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your Slack workspace to import and manage emojis
        </p>
      </div>
      <div className="space-y-4">
        {!hasSlack ? (
          <>
            {/* Mobile: Show Pair to Desktop as primary option */}
            {isMobile && <PairToMobile />}

            {/* Chrome Extension Connection Card - secondary on mobile */}
            {isMobile ? (
              <Card>
                <CardContent className="p-4">
                  <Collapsible open={isChromeExtensionOpen}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2 shrink-0">
                        <ChromeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          onClick={() => setIsChromeExtensionOpen(!isChromeExtensionOpen)}
                          className="w-full justify-between p-0 h-auto text-left hover:bg-transparent"
                        >
                          <div className="text-left">
                            <h3 className="font-semibold">Chrome Extension</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Desktop browser extension
                            </p>
                          </div>
                          <div className="ml-2 shrink-0">
                            {isChromeExtensionOpen ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </Button>
                        <CollapsibleContent>
                          <div className="mt-3 space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Install on desktop for one-click auth.
                            </p>
                            <Button
                              className="w-full"
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a
                                href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2"
                              >
                                <ChromeIcon className="h-4 w-4" />
                                Get Extension
                              </a>
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </Collapsible>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <ChromeIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold">Chrome Extension (Recommended)</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          One-click authentication with the Chrome extension. The fastest way to connect your Slack workspace.
                        </p>
                      </div>
                      <Button
                        className="w-full sm:w-auto"
                        asChild
                      >
                        <a
                          href="https://chromewebstore.google.com/detail/jpfabnpgomjgomlndffnpcceljgopgoa"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2"
                        >
                          <ChromeIcon className="h-4 w-4" />
                          Get Chrome Extension
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manual Setup - always collapsible */}
            <Card>
              <CardContent className={isMobile ? "p-4" : "p-6"}>
                <Collapsible open={isManualSetupOpen}>
                  <div className={`flex items-start ${isMobile ? "gap-3" : "gap-4"}`}>
                    <div className={`rounded-lg bg-muted ${isMobile ? "p-2 shrink-0" : "p-3"}`}>
                      <Terminal className={`${isMobile ? "h-5 w-5" : "h-6 w-6"} text-muted-foreground`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        onClick={() => setIsManualSetupOpen(!isManualSetupOpen)}
                        className="w-full justify-between p-0 h-auto text-left hover:bg-transparent"
                      >
                        <div className="text-left">
                          <h3 className="font-semibold">Manual Setup</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isMobile ? "Advanced curl method" : "Advanced method using browser developer tools"}
                          </p>
                        </div>
                        <div className="ml-2 shrink-0">
                          {isManualSetupOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </Button>
                      <CollapsibleContent>
                        <div className="mt-4">
                          <SlackCurlInput />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </div>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Desktop: Show Pair to Mobile after other options */}
            {!isMobile && <PairToMobile />}
          </>
        ) : (
          <>
            {/* Connected state banner */}
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <Zap className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Workspace Connected</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your Slack workspace is synced and ready
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Show the same connection options as disconnected state, just collapsible */}
            {/* Mobile: Show Pair to Desktop as primary option */}
            {isMobile && <PairToMobile />}

            {/* Chrome Extension Connection Card - collapsible when connected */}
            {isMobile ? (
              <Card>
                <CardContent className="p-4">
                  <Collapsible open={isChromeExtensionConnectedOpen}>
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2 shrink-0">
                        <ChromeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          onClick={() => setIsChromeExtensionConnectedOpen(!isChromeExtensionConnectedOpen)}
                          className="w-full justify-between p-0 h-auto text-left hover:bg-transparent"
                        >
                          <div className="text-left">
                            <h3 className="font-semibold">Chrome Extension</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Desktop browser extension
                            </p>
                          </div>
                          <div className="ml-2 shrink-0">
                            {isChromeExtensionConnectedOpen ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </Button>
                        <CollapsibleContent>
                          <div className="mt-3">
                            <ChromeExtensionOption />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </Collapsible>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6">
                  <Collapsible open={isChromeExtensionConnectedOpen}>
                    <div className="flex items-start gap-4">
                      <div className="rounded-lg bg-muted p-3">
                        <ChromeIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <Button
                          variant="ghost"
                          onClick={() => setIsChromeExtensionConnectedOpen(!isChromeExtensionConnectedOpen)}
                          className="w-full justify-between p-0 h-auto text-left hover:bg-transparent"
                        >
                          <div className="text-left">
                            <h3 className="font-semibold">Chrome Extension</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              One-click authentication with browser extension
                            </p>
                          </div>
                          <div className="ml-2 shrink-0">
                            {isChromeExtensionConnectedOpen ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </Button>
                        <CollapsibleContent>
                          <div className="mt-4">
                            <ChromeExtensionOption />
                          </div>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </Collapsible>
                </CardContent>
              </Card>
            )}

            {/* Manual Setup - always collapsible when connected */}
            <Card>
              <CardContent className={isMobile ? "p-4" : "p-6"}>
                <Collapsible open={isManualSetupOpen}>
                  <div className={`flex items-start ${isMobile ? "gap-3" : "gap-4"}`}>
                    <div className={`rounded-lg bg-muted ${isMobile ? "p-2 shrink-0" : "p-3"}`}>
                      <Terminal className={`${isMobile ? "h-5 w-5" : "h-6 w-6"} text-muted-foreground`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Button
                        variant="ghost"
                        onClick={() => setIsManualSetupOpen(!isManualSetupOpen)}
                        className="w-full justify-between p-0 h-auto text-left hover:bg-transparent"
                      >
                        <div className="text-left">
                          <h3 className="font-semibold">Update Connection</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {isMobile ? "Update or change workspace" : "Update authentication or change workspace"}
                          </p>
                        </div>
                        <div className="ml-2 shrink-0">
                          {isManualSetupOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </Button>
                      <CollapsibleContent>
                        <div className="mt-4">
                          <SlackCurlInput />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </div>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Desktop: Show Pair to Mobile after other options */}
            {!isMobile && <PairToMobile />}
          </>
        )}
      </div>
    </div>
  )
}
