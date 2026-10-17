import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileSearch, Sparkles, Wrench, Leaf } from "lucide-react";
import Link from "next/link";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}

const steps = [
  {
    title: "Upload a photo",
    description: "Take or upload an image of the damaged item.",
  },
  {
    title: "Understand the damage",
    description: "AI identifies visible damage and possible causes.",
  },
  {
    title: "Compare repair and replacement",
    description: "See cost, life, and sustainability trade-offs.",
  },
  {
    title: "Fix, reuse, or recycle responsibly",
    description: "Connect with qualified repair professionals.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-16 pb-16">
      <section className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 text-center md:px-6 lg:gap-8">
        <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          AI-powered repair intelligence
        </span>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
          Fix More. Waste Less.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Discover what’s wrong, understand your repair options, and give your belongings a second life with AI.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/analyze">
              Analyze an Item
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#how-it-works">Explore How It Works</Link>
          </Button>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold md:text-3xl">How it works</h2>
          <p className="text-muted-foreground">
            A simple, transparent process from diagnosis to action.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <Card key={step.title} className="h-full">
              <CardHeader>
                <span className="text-sm font-medium text-emerald-600">Step {idx + 1}</span>
                <CardTitle className="text-base font-semibold">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {step.description}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-2xl font-semibold md:text-3xl">Why FixIt AI?</h2>
          <p className="text-muted-foreground">
            Combine AI insight with practical tools to make better repair decisions.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={FileSearch}
            title="AI Damage Analysis"
            description="Structured assessment of visible damage, causes, severity and repair feasibility."
          />
          <FeatureCard
            icon={Sparkles}
            title="Smart Repair Decisions"
            description="Deterministic comparison of repair vs replacement with confidence and warnings."
          />
          <FeatureCard
            icon={Wrench}
            title="Trusted Repair Professionals"
            description="Find and connect with specialists in your area (manual entry allowed)."
          />
          <FeatureCard
            icon={Leaf}
            title="Sustainability Tracking"
            description="Track estimated money saved, waste avoided, and repair activity over time."
          />
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 text-center md:px-6">
        <h2 className="text-2xl font-semibold md:text-3xl">Ready to give your item a second life?</h2>
        <p className="mt-2 text-muted-foreground">
          Upload a photo and get your AI repair report in minutes.
        </p>
        <div className="mt-6 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/analyze">
              Analyze an Item
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
