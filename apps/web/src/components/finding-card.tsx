"use client";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { Finding } from "@/lib/types";
import { SEVERITY_STYLES } from "@/lib/risk";
import { cn, shortAddress } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * Reusable finding card with expandable technical details.
 * `showEvidence` gates raw evidence behind Technical View.
 */
export function FindingCard({ finding, showEvidence }: { finding: Finding; showEvidence: boolean }) {
  const sev = SEVERITY_STYLES[finding.severity];
  const Icon = finding.severity === "critical" ? ShieldAlert : AlertTriangle;

  return (
    <div className="rounded-xl border bg-surface-deep" style={{ borderColor: sev.border }}>
      <Accordion type="single" collapsible>
        <AccordionItem value={finding.id}>
          <AccordionTrigger className="p-4">
            <Icon className="mt-0.5 size-4 shrink-0" style={{ color: sev.hex }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <Badge style={{ color: sev.hex, backgroundColor: sev.bg }}>{sev.label}</Badge>
                <span className="font-bold text-foreground">{finding.title}</span>
              </span>
              <span className="mt-1 block text-sm leading-snug text-muted">{finding.summary}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="border-t border-border px-4 pb-5 pl-[52px]">
            <dl className="grid min-w-0 grid-cols-1 gap-x-7 gap-y-4 pt-4 sm:grid-cols-2">
              <Field label="Why this matters" full>
                {finding.detail}
              </Field>
              {finding.technical ? (
                <Field label="Technical explanation" full>
                  {finding.technical}
                </Field>
              ) : null}
              {finding.controller ? (
                <Field label="Controller" mono>
                  {shortAddress(finding.controller)}
                </Field>
              ) : null}
              {finding.affectedFunction ? (
                <Field label="Affected function" mono>
                  {finding.affectedFunction}
                </Field>
              ) : null}
              {finding.block ? (
                <Field label="Block" mono>
                  {finding.block.toLocaleString()}
                </Field>
              ) : null}
              {finding.confidence ? (
                <Field label="Confidence">
                  <span className="font-bold capitalize text-primary">{finding.confidence}</span>
                </Field>
              ) : null}
              {finding.recommendation ? (
                <div className="min-w-0 rounded-lg border border-border bg-surface p-3 sm:col-span-2">
                  <dt className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">Recommendation</dt>
                  <dd className="text-sm leading-relaxed text-secondary">{finding.recommendation}</dd>
                </div>
              ) : null}
              {showEvidence && finding.evidence ? (
                <div className="min-w-0 sm:col-span-2">
                  <dt className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
                    Evidence · Detector {finding.detectorId} {finding.detectorVersion}
                  </dt>
                  <pre className="overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-[#0a0d08] p-3.5 font-mono text-xs leading-relaxed text-[#9fb98a]">
                    {finding.evidence}
                  </pre>
                </div>
              ) : null}
            </dl>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function Field({
  label,
  children,
  full,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={cn("min-w-0", full ? "sm:col-span-2" : undefined)}>
      <dt className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className={cn(mono ? "font-mono text-sm text-secondary" : "text-sm leading-relaxed text-secondary", "break-words")}>
        {children}
      </dd>
    </div>
  );
}
