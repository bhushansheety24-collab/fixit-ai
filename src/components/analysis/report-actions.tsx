"use client";

import { Printer, Download, RotateCcw, MessageSquare, Scale, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ReportActions({ analysisId, category }: { analysisId: string; category: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center print:hidden">
      <Button asChild>
        <Link href={`/assistant/${analysisId}`}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Ask a Follow-up Question
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/compare/${analysisId}`}>
          <Scale className="mr-2 h-4 w-4" />
          Compare Repair vs Replacement
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/professionals?category=${encodeURIComponent(category)}`}>
          <Users className="mr-2 h-4 w-4" />
          Find Repair Professionals
        </Link>
      </Button>
      <Button variant="ghost" onClick={() => window.print()}>
        <Download className="mr-2 h-4 w-4" />
        Download Report
      </Button>
      <Button variant="ghost" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      <Button variant="secondary" asChild>
        <Link href="/analyze">
          <RotateCcw className="mr-2 h-4 w-4" />
          Analyze Another Item
        </Link>
      </Button>
    </div>
  );
}
