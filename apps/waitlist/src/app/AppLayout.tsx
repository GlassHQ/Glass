import { Databuddy } from '@databuddy/sdk/react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Databuddy
        clientId="e5cb7775-b6f4-4586-9720-bdf6207a8302"
        trackHashChanges={true}
        trackAttributes={true}
        trackOutgoingLinks={true}
        trackInteractions={true}
        trackScrollDepth={true}
      />
    </>
  )
}
