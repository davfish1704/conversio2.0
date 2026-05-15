export function normalizeState(state: any) {
  if (!state) return state
  return {
    ...state,
    agentGoal:
      state.agentGoal ??
      state.mission ??
      null,
  }
}
