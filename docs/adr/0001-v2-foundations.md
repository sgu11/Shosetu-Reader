# ADR 0001: V2 Foundation Seams

## Status
Accepted

## Context

V2 adds multi-user support, durable jobs, live status, translation inventory
controls, and cost/progress observability. The current implementation still
uses a direct default-user helper and request-scoped background dispatch.

Without explicit seams, V2 feature work would repeatedly cut across the same
files and force large rewrites.

## Decision

We will introduce two foundational ports before starting larger V2 features:

1. `identity` will expose request-scoped user resolution
2. `jobs` will expose a queue abstraction for background dispatch

The current behavior remains in place through adapters:
- identity resolves to the existing default-user fallback
- jobs dispatch through an inline queue adapter

## Consequences

### Positive
- V2 features can be built against stable abstractions
- Profile-based multi-user support can land without rewriting library/reader/translation logic
- Durable queue infrastructure can replace inline dispatch cleanly
- The repo gains a clearer implementation boundary between app routes and infrastructure

### Negative
- Adds a small amount of abstraction before the final infrastructure exists
- Some behavior remains temporary until profile selection and Redis-backed jobs are fully implemented

## Follow-up
- Replace fallback identity resolution with active-profile selection
- Replace inline queue adapter with Redis-backed worker dispatch
- Persist queue lifecycle to `job_runs`
