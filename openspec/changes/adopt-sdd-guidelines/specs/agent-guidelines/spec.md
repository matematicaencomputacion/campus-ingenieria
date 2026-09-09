## ADDED Requirements

### Requirement: Shared project guidance
Agent entry points SHALL reference docs/base-standards.md as the shared source.

#### Scenario: Agent starts a change
- **WHEN** an agent reads its repository entry point
- **THEN** it is directed to the shared rules and current Campus architecture.

### Requirement: Evidence boundaries
Guidance SHALL distinguish load tests, slider tests, local CSS comparison and deployment.

#### Scenario: Deployment steps are skipped
- **WHEN** a successful workflow has skipped rsync
- **THEN** the agent reports deployment omitted, without claiming production was updated.

#### Scenario: CSS equivalence is reported
- **WHEN** the agent uses the computed style verifier
- **THEN** it reports the tested pages and capture conditions and does not call it a CI gate.
