import { Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'

function App() {
  return (
    <main className="bg-background text-foreground min-h-svh">
      <div className="mx-auto flex min-h-svh max-w-5xl flex-col items-center justify-center px-6 py-16">
        <div className="border-border bg-card text-card-foreground w-full max-w-3xl rounded-2xl border shadow-sm">
          <div className="flex flex-col gap-8 p-8 sm:p-10">
            <div className="bg-muted text-muted-foreground inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm">
              <Sparkles className="size-4" />
              Tailwind CSS v4 + shadcn/ui
            </div>

            <div className="space-y-4 text-left">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Client is ready for utility-first styling.
              </h1>
              <p className="text-muted-foreground max-w-2xl text-base sm:text-lg">
                Tailwind v4 is wired into Vite, design tokens are configured in
                <code className="bg-muted text-foreground mx-1 rounded px-1.5 py-0.5 text-sm">
                  src/index.css
                </code>
                , and shadcn/ui components can now be added from the existing
                setup.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button>Primary action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline" asChild>
                <a href="https://ui.shadcn.com/docs" target="_blank" rel="noreferrer">
                  Open shadcn docs
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
