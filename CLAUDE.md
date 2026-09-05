# GYM AI Assistant Instructions

@AGENTS.md
See [.cursorrules](file:///d:/GYM/.cursorrules) for full architectural guidelines, Master JSON Schema, and arbitration rules.

## The 4 Pillars Enforced
1. **Rule File**: LLM never does math for 1RMs, calories, or overload. Use deterministic `/src/lib/math.ts`.
2. **Layer 0 Priority**: `Hard Stop ≻ Down-Regulator ≻ Context ≻ Overload`.
3. **Data Persistence**: SQLite via `@libsql/client` (`file:gym.db`) with `globalThis.db` singleton in `src/db/index.ts`.
4. **Testing Harness**: Vitest (`pnpm test`) validates deterministic math and Layer 0 arbitration logic before UI generation.
5. **Coach Directives**: Sub-30-word limit strictly enforced at runtime by Zod.
