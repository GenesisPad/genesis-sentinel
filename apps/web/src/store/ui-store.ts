import { create } from "zustand";
import type { ChainId } from "@/lib/chains";

/**
 * Lightweight UI-only state. Scan data itself lives in TanStack Query — this store
 * holds transient interface concerns (selected chain, active scan id, expanded rows).
 */
interface UiState {
  selectedChain: ChainId | "auto";
  activeScanId: string | null;
  reportView: "trader" | "technical";
  expandedFindings: Record<string, boolean>;
  setChain: (chain: ChainId | "auto") => void;
  setActiveScan: (scanId: string | null) => void;
  setReportView: (view: "trader" | "technical") => void;
  toggleFinding: (id: string) => void;
  reset: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedChain: "auto",
  activeScanId: null,
  reportView: "trader",
  expandedFindings: {},
  setChain: (selectedChain) => set({ selectedChain }),
  setActiveScan: (activeScanId) => set({ activeScanId }),
  setReportView: (reportView) => set({ reportView }),
  toggleFinding: (id) =>
    set((s) => ({ expandedFindings: { ...s.expandedFindings, [id]: !s.expandedFindings[id] } })),
  reset: () => set({ activeScanId: null, expandedFindings: {} }),
}));
