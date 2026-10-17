import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata = { title: "Terms of Service — FixIt AI" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: {new Date().toISOString().slice(0, 10)}
      </p>

      <div className="mt-8 space-y-6">
        <Section title="1. The service">
          <p>
            FixIt AI helps you decide whether to repair, reuse or replace broken items, and
            connects you with repair professionals. Some marketplace entries are clearly
            labelled as <strong>demo data</strong>.
          </p>
        </Section>

        <Section title="2. Not professional advice">
          <p>
            All AI-generated analyses, cost estimates, safety notes and sustainability
            figures are <strong>estimates only</strong>. They are not certified engineering
            advice, financial advice, or verified environmental measurements. You remain
            responsible for any repair you undertake.
          </p>
        </Section>

        <Section title="3. Safety">
          <p>
            The decision engine blocks or warns against repairs it considers high-risk (for
            example mains electricity, gas, swollen batteries). Do not attempt a repair you
            are not competent to perform. Damaged appliances and lithium batteries can cause
            fire, injury or electric shock. When in doubt, use a qualified professional.
          </p>
        </Section>

        <Section title="4. Your account">
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide accurate information and keep your credentials secure.</li>
            <li>Do not misuse the service, upload unlawful content, or attempt to bypass rate limits or access controls.</li>
            <li>Content you upload remains yours; you grant the service the licence needed to store and process it.</li>
          </ul>
        </Section>

        <Section title="5. User content and reviews">
          <p>
            Reviews and request descriptions must be honest. Administrators may hide content
            that is abusive, fraudulent or irrelevant; moderation actions are recorded in an
            audit log.
          </p>
        </Section>

        <Section title="6. Liability">
          <p>
            The service is provided &quot;as is&quot; without warranties of any kind. To the
            maximum extent permitted by law, the operator is not liable for damages arising
            from use of AI-generated recommendations or from repairs performed based on them.
          </p>
        </Section>

        <Section title="7. Changes">
          <p>
            We may update these terms; the revision date above reflects the current version.
            Continued use of the service constitutes acceptance of the updated terms.
          </p>
        </Section>
      </div>

      <Separator className="my-8" />
      <Link href="/privacy" className="text-sm text-primary hover:underline">
        Read our Privacy Policy
      </Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}
