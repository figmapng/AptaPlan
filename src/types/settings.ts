export type PlannerSettings = { completedPlacement: 'keep' | 'bottom'; haptics: boolean; sortMode: 'time' | 'manual' };
export const defaultSettings: PlannerSettings = { completedPlacement: 'bottom', haptics: true, sortMode: 'time' };
