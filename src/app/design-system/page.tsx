"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Switch } from "@/components/ui/switch"

const sampleData = [
  { id: "1", name: "Max Mustermann", status: "active", score: 85 },
  { id: "2", name: "Erika Musterfrau", status: "pending", score: 42 },
  { id: "3", name: "John Doe", status: "inactive", score: 13 },
]

const sampleColumns: Column<typeof sampleData[0]>[] = [
  { key: "name", label: "Name", sortable: true, filterable: true, render: (r) => r.name },
  { key: "status", label: "Status", sortable: true, render: (r) => <Badge variant={r.status === "active" ? "success" : r.status === "pending" ? "warning" : "neutral"}>{r.status}</Badge> },
  { key: "score", label: "Score", sortable: true, render: (r) => <span className="font-mono tabular-nums">{r.score}</span> },
]

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-bg-primary p-8 space-y-12 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-primary">Design System</h1>
        <p className="text-sm text-text-secondary">Conversio v2 — Dark-first, industrial minimal, single accent</p>
      </div>

      {/* Buttons */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Buttons</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="xs">Primary XS</Button>
          <Button variant="primary" size="sm">Primary SM</Button>
          <Button variant="primary" size="md">Primary MD</Button>
          <Button variant="primary" size="lg">Primary LG</Button>
          <Button variant="primary" size="sm" loading>Loading</Button>
          <Button variant="primary" size="sm" disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm">Secondary</Button>
          <Button variant="ghost" size="sm">Ghost</Button>
          <Button variant="outline" size="sm">Outline</Button>
          <Button variant="danger" size="sm">Danger</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Inputs</h2>
        <div className="space-y-2 max-w-sm">
          <Input placeholder="Default input" />
          <Input placeholder="Disabled input" disabled />
          <Input placeholder="With error" className="border-destructive focus-visible:ring-destructive" />
        </div>
      </section>

      {/* Switch */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Switch</h2>
        <div className="flex items-center gap-3">
          <Switch />
          <Switch defaultChecked />
          <Switch disabled />
        </div>
      </section>

      {/* KBD */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Keyboard</h2>
        <div className="flex flex-wrap gap-2 items-center text-xs text-text-secondary">
          Press <Kbd keys={["⌘"]} /><Kbd keys={["K"]} /> to search
          <span className="mx-2">·</span>
          <Kbd keys={["J"]} /> <Kbd keys={["K"]} /> navigate
          <span className="mx-2">·</span>
          <Kbd keys={["Enter"]} /> select
        </div>
      </section>

      {/* Spinner */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Spinners</h2>
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </section>

      {/* Card */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Card</h2>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Board Overview</CardTitle>
            <CardDescription>12 active leads, 3 AI conversations</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-text-secondary">Last activity 2 minutes ago. 2 pending supervisor actions.</p>
          </CardContent>
          <CardFooter>
            <Button size="xs" variant="secondary">Open Board</Button>
            <Button size="xs" variant="ghost">Dismiss</Button>
          </CardFooter>
        </Card>
      </section>

      {/* Tabs */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Tabs</h2>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Overview</TabsTrigger>
            <TabsTrigger value="tab2">Activity</TabsTrigger>
            <TabsTrigger value="tab3">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="text-xs text-text-secondary pt-3">Overview content here</TabsContent>
          <TabsContent value="tab2" className="text-xs text-text-secondary pt-3">Activity content here</TabsContent>
          <TabsContent value="tab3" className="text-xs text-text-secondary pt-3">Settings content here</TabsContent>
        </Tabs>
      </section>

      {/* Accordion */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Accordion</h2>
        <Accordion type="single" collapsible className="max-w-md">
          <AccordionItem value="1">
            <AccordionTrigger>What is Conversio?</AccordionTrigger>
            <AccordionContent>AI-powered CRM for insurance brokers in the DACH region.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="2">
            <AccordionTrigger>How does the supervisor agent work?</AccordionTrigger>
            <AccordionContent>Detection rules scan agent runs every 5 minutes and notify admins via Telegram.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* DataTable */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Data Table</h2>
        <DataTable
          columns={sampleColumns}
          data={sampleData}
          keyField="id"
          searchPlaceholder="Filter leads..."
          onRowClick={(r) => console.log("clicked", r)}
        />
      </section>

      {/* Typography */}
      <section className="space-y-3 pb-16">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Typography</h2>
        <div className="space-y-2">
          <p className="text-4xl font-semibold text-text-primary">Heading 1 (30px)</p>
          <p className="text-2xl font-semibold text-text-primary">Heading 2 (24px)</p>
          <p className="text-xl font-semibold text-text-primary">Heading 3 (20px)</p>
          <p className="text-base text-text-primary">Body (14px) — The quick brown fox jumps over the lazy dog. Conversio hilft Versicherungsmaklern beim Vertrieb.</p>
          <p className="text-sm text-text-secondary">Small (13px) — Secondary text with less emphasis.</p>
          <p className="text-xs text-text-tertiary">Caption (12px) — Teritary text, metadata, timestamps.</p>
          <p className="text-2xs text-text-tertiary">Extra small (10px) — Badges, legal, footnotes.</p>
          <p className="text-sm font-mono text-text-primary">Mono: System prompt, JSON, IDs, code — 14px JetBrains Mono</p>
        </div>
      </section>
    </div>
  )
}
