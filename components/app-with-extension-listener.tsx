"use client"

import { ExtensionClearDataListener } from "./extension-clear-data-listener"

export function AppWithExtensionListener({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ExtensionClearDataListener />
    </>
  )
}