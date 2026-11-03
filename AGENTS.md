# Agent Guidelines & Operating Instructions

## Core Directives for Antigravity Agent
To ensure high quality, zero confusion, and clean development, follow these rules strictly:

1. **Feature-by-Feature (One at a time)**:
   - **Never** generate the entire application in a single bulk sweep.
   - Build **only one feature at a time** as defined in `IMPLEMENTATION_PLAN.md`.
   - Test and verify the feature with the user. Proceed to the next feature only after getting explicit approval.

2. **Respect the Specifications**:
   - `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `BUSINESS_RULES.md`, `UI_UX_SPEC.md`, and `DATABASE_SPEC.md` are the single source of truth.
   - If a conflict arises, align with the documentation or ask the user for clarification before assuming.

3. **Code Quality & Simplicity**:
   - Keep components modular and readable.
   - Avoid bloated boilerplate or excessive third-party dependencies unless specified in the tech stack.
   - Ensure all UI matches the color palette and typography in `UI_UX_SPEC.md`.

4. **Security & Secrets**:
   - Keep the admin easter egg secret (`Bayern Munich`) strictly isolated in logic.
   - Do not hardcode live sensitive API keys in client-side code; use `.env.local`.

5. **User Verification Checkpoints**:
   - After completing each milestone in `IMPLEMENTATION_PLAN.md`, present:
     1. What was built.
     2. How to test it locally.
     3. Request user confirmation before starting the next feature.
