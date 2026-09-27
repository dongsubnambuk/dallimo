# External Activity Integration

## Domain
`Run` is the normalized activity source of truth. `CourseRecord` is a verified competitive projection of a Run.

## Required fields
- source
- source_provider
- provider_activity_id
- source_device_name
- imported_at
- trust_level
- import_status
- verification_policy_version

Use `(source_provider, provider_activity_id)` as the logical provider idempotency key.

## UI
- Integration Settings
- Import Candidates
- Import Result
- Source Badge
- Verification State

Do not assume imported records are ranking-eligible.
