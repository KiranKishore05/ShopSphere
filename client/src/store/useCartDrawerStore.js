import { create } from 'zustand';

export const useCartDrawerStore = create((set) => ({
  isOpen: false,
  openCartDrawer: () => set({ isOpen: true }),
  closeCartDrawer: () => set({ isOpen: false }),
  toggleCartDrawer: () => set((state) => ({ isOpen: !state.isOpen }))
}));

export default useCartDrawerStore;
