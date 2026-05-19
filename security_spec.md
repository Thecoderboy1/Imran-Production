# Security Spec: Project Tracker CRM

## Data Invariants
1. A project must belong to a client.
2. A project must have a budget, received amount, and the calculated due money.
3. Only the owner (Imran) can view/modify their clients and projects.
4. Timestamps (createdAt, updatedAt) must be valid.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a client with someone else's `ownerId`.
2. **Orphan Project**: Create a project with a non-existent `clientId`.
3. **Ghost Update**: Update a project's `ownerId` to hijack it.
4. **Budget Hack**: Set a negative budget.
5. **Role Escalation**: Attempt to set a custom "role" field (not in schema).
6. **ID Poisoning**: Use a 1.5MB string as a document ID.
7. **Cross-Tenant Access**: Read projects using a query that doesn't filter by `ownerId`.
8. **PII Leak**: Access another user's client list.
9. **Terminal State Break**: (N/A for now, but will monitor status).
10. **Resource Exhaustion**: Send a massive 1MB string in the `name` field.
11. **Malicious Enum**: Set `videoType` to "Malicious Form".
12. **Unauthorized Deletion**: Delete a client owned by someone else.

## Rules Finalization State: DRAFT
Waiting for build and test confirmation.
