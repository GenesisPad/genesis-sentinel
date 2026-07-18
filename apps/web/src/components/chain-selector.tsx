"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_CHAINS, type ChainId } from "@/lib/chains";
import { useUiStore } from "@/store/ui-store";

const OPTIONS: Array<{ id: ChainId | "auto"; label: string; color: string }> = [
  { id: "auto", label: "Auto-detect", color: "#8b938a" },
  ...SUPPORTED_CHAINS.map((c) => ({ id: c.id, label: c.label, color: c.color })),
];

export function ChainSelector() {
  const selected = useUiStore((s) => s.selectedChain);
  const setChain = useUiStore((s) => s.setChain);
  const active = OPTIONS.find((o) => o.id === selected) ?? OPTIONS[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Select chain"
          className="flex h-full items-center gap-2 whitespace-nowrap rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="size-2 rounded-full" style={{ backgroundColor: active.color }} aria-hidden />
          {active.label}
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-40 w-52 rounded-xl border border-border-strong bg-surface-deep p-1.5 shadow-xl"
        >
          {OPTIONS.map((o) => (
            <DropdownMenu.Item
              key={o.id}
              onSelect={() => setChain(o.id)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground outline-none data-[highlighted]:bg-[#161a12]"
              data-selected={selected === o.id}
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />
              {o.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
