# GPU Check

The supplied `checkGPU` function is kept in `src/check-gpu.ts`. `src/main.ts`
only creates its page and button. CI compiles the TypeScript into a CommonJS
guest bundle and writes the normal text package.

The shell must link `BackgroundTasks` and include its native metadata. On the
iOS 26+ integration simulator the alert must contain `Background GPU: true` or
`Background GPU: false`; the unavailable-API fallback fails this milestone.

`false` is a legitimate system result. This example does not submit a
background task, prove GPU execution, or prove that a Personal Team profile
authorizes the Background GPU entitlement.
