import { Activity, Droplet, Lock, Users } from "lucide-react";

const ITEMS = [
  { Icon: Lock, tint: "rgba(180,241,31,0.1)", color: "#b4f11f", title: "Contract Controls", body: "Can the owner mint, blacklist, pause trading or change taxes?" },
  { Icon: Activity, tint: "rgba(245,166,35,0.12)", color: "#f5a623", title: "Trading Safety", body: "Can users buy, sell and transfer under different conditions?" },
  { Icon: Droplet, tint: "rgba(110,168,255,0.12)", color: "#6ea8ff", title: "Liquidity", body: "Who controls the LP, and can liquidity be removed?" },
  { Icon: Users, tint: "rgba(167,139,250,0.14)", color: "#a78bfa", title: "Holder Distribution", body: "Is supply concentrated across related wallets?" },
];

export function WhatWeCheck() {
  return (
    <section className="rounded-2xl border border-border bg-surface-deep p-8 sm:p-10">
      <h2 className="mb-7 text-center font-display text-2xl font-semibold">What Genesis Sentinel checks</h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {ITEMS.map((it, i) => (
          <div key={it.title} className={i < ITEMS.length - 1 ? "lg:border-r lg:border-border lg:px-6" : "lg:px-6"}>
            <div className="mb-3.5 flex size-11 items-center justify-center rounded-xl" style={{ background: it.tint, color: it.color }}>
              <it.Icon className="size-5" aria-hidden />
            </div>
            <h3 className="mb-1.5 text-base font-semibold">{it.title}</h3>
            <p className="text-sm leading-relaxed text-muted">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
