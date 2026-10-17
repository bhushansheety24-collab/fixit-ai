import Link from "next/link";
import { Wrench, Leaf, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-sm">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">FixIt AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Fix More. Waste Less. Give your belongings a second life with AI-powered repair guidance.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Platform</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/analyze" className="hover:text-foreground">Analyze an Item</Link></li>
            <li><Link href="/professionals" className="hover:text-foreground">Find Repair Professionals</Link></li>
            <li><Link href="/sustainability" className="hover:text-foreground">Sustainability Impact</Link></li>
            <li><Link href="/requests" className="hover:text-foreground">Repair Requests</Link></li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Sustainability</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Leaf className="h-4 w-4 text-emerald-600"/>Extend product lifespans</li>
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600"/>Reduce unnecessary waste</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Legal</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-foreground">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t px-4 py-5 text-center text-sm text-muted-foreground md:px-6">
        © {new Date().getFullYear()} FixIt AI. All estimates are AI-generated and should be verified independently.
      </div>
    </footer>
  );
}
