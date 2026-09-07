import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">GitPulse</CardTitle>
            <Badge variant="secondary">Foundation Active</Badge>
          </div>
          <CardDescription>
            GitHub Repository Analytics Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Repository analytics, health metrics, and workflow tracking coming soon.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" size="sm">
            Documentation
          </Button>
          <Button size="sm">Get Started</Button>
        </CardFooter>
      </Card>
    </main>
  );
}
