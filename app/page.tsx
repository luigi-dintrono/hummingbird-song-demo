import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Welcome to Hummingbird Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A Next.js project with shadcn/ui components integrated and ready to use.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Button Components</CardTitle>
              <CardDescription>
                Various button styles and variants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Badge Components</CardTitle>
              <CardDescription>
                Status indicators and labels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card Component</CardTitle>
              <CardDescription>
                This is a card component example
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cards are perfect for displaying content in a structured way.
                They can contain headers, descriptions, content, and footers.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Action Button</Button>
            </CardFooter>
          </Card>

          <Card className="md:col-span-2 lg:col-span-3">
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Your Next.js project is ready with shadcn/ui
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  <span>Next.js 16 with App Router</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  <span>TypeScript configured</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  <span>Tailwind CSS v4</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">✓</Badge>
                  <span>shadcn/ui components ready</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button>Add More Components</Button>
              <Button variant="outline">View Documentation</Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
