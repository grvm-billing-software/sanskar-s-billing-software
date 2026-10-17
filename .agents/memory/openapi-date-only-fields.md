---
name: OpenAPI date-only fields
description: Preserve calendar-date values when generated Zod schemas coerce OpenAPI dates to JavaScript Date objects.
---

Generated Zod schemas for OpenAPI `format: date` can coerce `YYYY-MM-DD` strings to JavaScript `Date` objects. Serializing those validated values directly changes the wire representation to a timestamp, which can break date inputs and equality comparisons.

**Why:** Date-only values represent calendar days, not instants; timezone offsets and timestamp formatting can shift or mismatch them.

**How to apply:** Validate date-only response fields with the generated schema, then restore the persisted `YYYY-MM-DD` strings before JSON serialization. Keep true timestamps as ISO datetime values.
