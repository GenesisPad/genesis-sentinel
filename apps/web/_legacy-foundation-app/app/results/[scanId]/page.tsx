import { loadEnv } from "@genesis-sentinel/config";
import type { FindingSeverity, ScanResultView, SecurityFindingView } from "@genesis-sentinel/shared";

interface PageProps {
  params: Promise<{
    scanId: string;
  }>;
}

const severityOrder: FindingSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

export default async function ResultPage({ params }: PageProps) {
  const { scanId } = await params;
  const result = await fetchScanResult(scanId);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <a className="text-sm font-medium text-[#006d5b]" href="/">
        Back to scanner
      </a>
      <h1 className="mt-6 text-3xl font-semibold tracking-normal text-[#101828]">Scan result</h1>

      {result ? <ResultSummary result={result} /> : <MissingResult />}
    </main>
  );
}

async function fetchScanResult(scanId: string): Promise<ScanResultView | null> {
  const env = loadEnv();
  const response = await fetch(
    `${env.WEB_PUBLIC_API_BASE_URL}/v1/scans/${encodeURIComponent(scanId)}/result`,
    {
      cache: "no-store"
    }
  ).catch(() => undefined);

  return response?.ok ? ((await response.json()) as ScanResultView) : null;
}

function ResultSummary({ result }: { result: ScanResultView }) {
  return (
    <div className="mt-6 grid gap-6">
      <section className="rounded-lg border border-[#d0d5dd] bg-white p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Risk status" value={result.risk.level} />
          <Metric label="Score" value={result.risk.score === null ? "Not scored" : result.risk.score.toString()} />
          <Metric label="Confidence" value={result.risk.confidence} />
        </div>
        <p className="mt-4 text-sm leading-6 text-[#475467]">{result.risk.message}</p>
      </section>

      <section className="rounded-lg border border-[#d0d5dd] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#101828]">Scan metadata</h2>
        <dl className="mt-4 grid gap-3 text-sm text-[#475467] md:grid-cols-2">
          <Metadata label="State" value={result.scan.state} />
          <Metadata label="Chain" value={result.scan.chainId.toString()} />
          <Metadata label="Address" value={result.scan.address} />
          <Metadata label="Scanner" value={result.scan.scannerVersion} />
          <Metadata label="Submitted" value={result.scan.submittedAt} />
          <Metadata label="Block" value={result.scan.scanBlockNumber ?? "Not captured yet"} />
        </dl>
      </section>

      <section className="rounded-lg border border-[#d0d5dd] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#101828]">Findings</h2>
        <div className="mt-4 grid gap-4">
          {result.findings.length === 0 ? (
            <p className="text-sm text-[#475467]">
              No detector findings are persisted for this scan yet.
            </p>
          ) : (
            severityOrder.map((severity) => {
              const findings = result.findings.filter((finding) => finding.severity === severity);
              return findings.length > 0 ? (
                <FindingGroup key={severity} severity={severity} findings={findings} />
              ) : null;
            })
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#d0d5dd] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#101828]">Liquidity</h2>
        <p className="mt-2 text-sm leading-6 text-[#475467]">{result.liquidity.message}</p>
        <div className="mt-4 grid gap-3">
          {result.liquidity.pools.length === 0 ? (
            <p className="text-sm text-[#667085]">No liquidity pool records are persisted for this token yet.</p>
          ) : (
            result.liquidity.pools.map((pool) => (
              <div key={pool.poolAddress} className="rounded-md border border-[#eaecf0] p-3 text-sm text-[#475467]">
                <div className="font-medium text-[#344054]">{pool.dex ?? "Unknown DEX"}</div>
                <div className="break-words">Pool: {pool.poolAddress}</div>
                {pool.quoteTokenAddress ? <div className="break-words">Quote: {pool.quoteTokenAddress}</div> : null}
                {pool.firstObservedBlock ? <div>First observed: {pool.firstObservedBlock}</div> : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#d0d5dd] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#101828]">Holders</h2>
        <p className="mt-2 text-sm leading-6 text-[#475467]">{result.holders.message}</p>
        <div className="mt-4 grid gap-3">
          {result.holders.snapshots.length === 0 ? (
            <p className="text-sm text-[#667085]">
              No holder snapshot records are persisted for this token yet.
            </p>
          ) : (
            result.holders.snapshots.map((snapshot) => (
              <div
                key={`${snapshot.tokenAddress}:${snapshot.blockNumber}`}
                className="rounded-md border border-[#eaecf0] p-3 text-sm text-[#475467]"
              >
                <div className="font-medium text-[#344054]">Block {snapshot.blockNumber}</div>
                {snapshot.holderCount !== undefined ? (
                  <div>Holder count: {snapshot.holderCount}</div>
                ) : null}
                {snapshot.concentration ? <div>Concentration data persisted</div> : null}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#d0d5dd] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#101828]">Simulations</h2>
        <div className="mt-4 grid gap-3">
          {result.simulations.length === 0 ? (
            <p className="text-sm text-[#475467]">No simulation records are persisted for this scan yet.</p>
          ) : (
            result.simulations.map((simulation) => (
              <div key={simulation.id} className="rounded-md border border-[#eaecf0] p-3 text-sm text-[#475467]">
                <div className="font-medium text-[#344054]">
                  {simulation.kind}: {simulation.outcome}
                </div>
                <div>Tool: {simulation.simulationTool}</div>
                {simulation.blockNumber ? <div>Block: {simulation.blockNumber}</div> : null}
                {typeof simulation.result?.reason === "string" ? <div>{simulation.result.reason}</div> : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-[#667085]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-[#101828]">{value}</dd>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-[#344054]">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function FindingGroup({
  severity,
  findings
}: {
  severity: FindingSeverity;
  findings: SecurityFindingView[];
}) {
  return (
    <div className="border-t border-[#eaecf0] pt-4">
      <h3 className="text-sm font-semibold text-[#344054]">{severity}</h3>
      <div className="mt-3 grid gap-4">
        {findings.map((finding) => (
          <article key={finding.id} className="rounded-md border border-[#d0d5dd] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-[#101828]">{finding.title}</h4>
              <span className="rounded-md bg-[#eef4ff] px-2 py-1 text-xs font-medium text-[#3538cd]">
                {finding.confidence}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[#475467]">{finding.description}</p>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{finding.technicalExplanation}</p>
            {finding.recommendation ? (
              <p className="mt-2 text-sm leading-6 text-[#344054]">{finding.recommendation}</p>
            ) : null}
            <div className="mt-3 grid gap-2">
              {finding.evidence.map((evidence, index) => (
                <div key={`${finding.id}:${index}`} className="rounded-md bg-[#f9fafb] p-3 text-sm text-[#475467]">
                  <div className="font-medium text-[#344054]">
                    {evidence.type}: {evidence.summary}
                  </div>
                  {evidence.blockNumber ? <div>Block: {evidence.blockNumber}</div> : null}
                  {evidence.address ? <div className="break-words">Address: {evidence.address}</div> : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MissingResult() {
  return (
    <p className="mt-6 text-[#475467]">
      No scan result was found, or the API is unavailable. Submitted scans may still be queued or
      processing.
    </p>
  );
}
