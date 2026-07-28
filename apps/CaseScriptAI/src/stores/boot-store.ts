import { create } from 'zustand';

export type LaunchDestination = 'download' | 'app';

type BootStore = {
  destination: LaunchDestination | null;
  setDestination: (destination: LaunchDestination) => void;
};

export const useBootStore = create<BootStore>((set) => ({
  destination: null,
  setDestination: (destination) => set({ destination }),
}));
