import { create } from 'zustand';
import type {
  EdaArtifactBundle,
  EdaAssetDraft,
  EdaBuilderJob,
  EdaBuilderJobEvent,
  EdaExistingAssetState,
  EdaRequestedArtifacts,
  EdaSource,
} from '../providers/types/eda-builder';

const STORAGE_KEY = 'cc_eda_builder_session_v01';

export type EdaBuilderStep = 0 | 1 | 2 | 3 | 4 | 5;

interface EdaBuilderState {
  open: boolean;
  step: EdaBuilderStep;
  source: EdaSource;
  selectedFileName?: string;
  existingAssets: EdaExistingAssetState;
  requestedArtifacts: EdaRequestedArtifacts;
  job?: EdaBuilderJob;
  draft?: EdaAssetDraft;
  events: EdaBuilderJobEvent[];
  artifacts?: EdaArtifactBundle;
  busy: boolean;
  message?: string;
  openBuilder: (source?: Partial<EdaSource>) => void;
  closeBuilder: () => void;
  resetBuilder: () => void;
  setStep: (step: EdaBuilderStep) => void;
  setSource: (source: Partial<EdaSource>) => void;
  setSelectedFileName: (name?: string) => void;
  setExistingAssets: (assets: Partial<EdaExistingAssetState>) => void;
  setRequestedArtifacts: (requested: Partial<EdaRequestedArtifacts>) => void;
  setJob: (job?: EdaBuilderJob) => void;
  setDraft: (draft?: EdaAssetDraft) => void;
  setEvents: (events: EdaBuilderJobEvent[]) => void;
  setArtifacts: (artifacts?: EdaArtifactBundle) => void;
  setBusy: (busy: boolean) => void;
  setMessage: (message?: string) => void;
  restore: () => void;
}

const defaultSource: EdaSource = { type: 'pdf_upload' };
const defaultExistingAssets: EdaExistingAssetState = {
  datasheet: false,
  pinData: false,
  symbol: false,
  footprint: false,
  step: false,
  vrml: false,
};
const defaultRequestedArtifacts: EdaRequestedArtifacts = {
  symbol9: true,
  symbol10: true,
  footprint: true,
  step: true,
  vrml: false,
};

const persist = (state: Pick<EdaBuilderState, 'step' | 'source' | 'selectedFileName' | 'existingAssets' | 'requestedArtifacts' | 'job' | 'draft' | 'events' | 'artifacts'>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore persistence failures; the mock workflow remains usable.
  }
};

export const useEdaBuilderStore = create<EdaBuilderState>((set, get) => ({
  open: false,
  step: 0,
  source: defaultSource,
  existingAssets: defaultExistingAssets,
  requestedArtifacts: defaultRequestedArtifacts,
  events: [],
  busy: false,
  openBuilder: (source) => {
    set((state) => ({ open: true, source: { ...state.source, ...source } }));
    get().restore();
    if (source) get().setSource(source);
  },
  closeBuilder: () => set({ open: false }),
  resetBuilder: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    set({
      step: 0,
      source: defaultSource,
      selectedFileName: undefined,
      existingAssets: defaultExistingAssets,
      requestedArtifacts: defaultRequestedArtifacts,
      job: undefined,
      draft: undefined,
      events: [],
      artifacts: undefined,
      busy: false,
      message: undefined,
    });
  },
  setStep: (step) => {
    set({ step });
    const s = get();
    persist(s);
  },
  setSource: (source) => {
    set((state) => ({ source: { ...state.source, ...source } }));
    persist(get());
  },
  setSelectedFileName: (selectedFileName) => {
    set({ selectedFileName });
    persist(get());
  },
  setExistingAssets: (assets) => {
    set((state) => ({ existingAssets: { ...state.existingAssets, ...assets } }));
    persist(get());
  },
  setRequestedArtifacts: (requested) => {
    set((state) => ({ requestedArtifacts: { ...state.requestedArtifacts, ...requested } }));
    persist(get());
  },
  setJob: (job) => {
    set({ job });
    persist(get());
  },
  setDraft: (draft) => {
    set({ draft });
    persist(get());
  },
  setEvents: (events) => {
    set({ events });
    persist(get());
  },
  setArtifacts: (artifacts) => {
    set({ artifacts });
    persist(get());
  },
  setBusy: (busy) => set({ busy }),
  setMessage: (message) => set({ message }),
  restore: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<EdaBuilderState>;
      set({
        step: saved.step ?? 0,
        source: saved.source ?? defaultSource,
        selectedFileName: saved.selectedFileName,
        existingAssets: saved.existingAssets ?? defaultExistingAssets,
        requestedArtifacts: saved.requestedArtifacts ?? defaultRequestedArtifacts,
        job: saved.job,
        draft: saved.draft,
        events: saved.events ?? [],
        artifacts: saved.artifacts,
      });
    } catch {
      // Ignore corrupted local state.
    }
  },
}));
