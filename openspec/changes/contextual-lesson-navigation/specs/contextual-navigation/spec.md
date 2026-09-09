## Purpose
Permitir que el alumno explore lecciones y vuelva a su catálogo o materia sin perder el contexto de navegación.

## ADDED Requirements

### Requirement: Catalog state survives a lesson visit
The catalog SHALL preserve search text and category across lesson visits, reloads and browser Back.

#### Scenario: Filtered round trip
- **WHEN** a student filters by Trigonometría and searches seno, opens a lesson and follows its return link
- **THEN** the same search, category and matching results are restored.

#### Scenario: Invalid category
- **WHEN** the URL contains an unknown category
- **THEN** the catalog uses Todas without crashing.

#### Scenario: Catalog opened from a materia
- **WHEN** the catalog is opened from a materia and the student follows its return link
- **THEN** the originating materia tab is restored.

### Requirement: One safe return control per lesson
Each lesson SHALL expose one return control, preserving its existing presentation, with a descriptive accessible name. Direct entry SHALL return to the catalog; explicit destinations SHALL be limited to this Campus index or catalog on the same origin.

#### Scenario: Direct or untrusted entry
- **WHEN** a lesson is opened without context or with an external or unsupported return destination
- **THEN** its return link leads to the local catalog without using browser history or the referrer.

#### Scenario: Materia round trip
- **WHEN** an interactive is opened in a separate tab from a materia
- **THEN** its return link restores the originating materia and tab, including the selected node when present.

### Requirement: Embedded lessons close without nested navigation
The materia viewer SHALL provide a close action both in its header and through the lesson return control, restoring focus to the originating node.

#### Scenario: Close embedded lesson
- **WHEN** either close action is activated
- **THEN** the iframe is removed, the materia remains open and the node button receives focus.

#### Scenario: Unrelated message
- **WHEN** a close request comes from another window or origin
- **THEN** the viewer remains open.

### Requirement: Navigation works without browser storage
Navigation SHALL remain functional when persistent storage is unavailable to the catalog and lessons.

#### Scenario: Storage unavailable
- **WHEN** storage access is disabled during a catalog and lesson round trip
- **THEN** state is restored from the URL and return links remain usable.

### Requirement: Shared bar does not cover lesson content
The shared navigation bar SHALL occupy normal document flow, expose its return label on mobile, and provide controls at least 44 CSS pixels high.

#### Scenario: Mobile and desktop lesson header
- **WHEN** a shared-bar lesson is opened at mobile or desktop width
- **THEN** the bar precedes the heading without overlap and its return action is operable by keyboard.

### Requirement: New lesson entry points preserve the navigation contract
All lessons SHALL load navigation dependencies and expose exactly one return action,
including lessons whose shared script has a version query.

#### Scenario: L200 and L201 open
- **WHEN** either lesson is loaded directly or from the catalog
- **THEN** navigation initializes without exceptions and there is only one return action.

### Requirement: Task queue and existing lesson sequence preserve origin
Queue links and existing previous/next lesson links SHALL preserve the validated originating catalog or materia URL.

#### Scenario: Queue round trip after a task update
- **WHEN** a filtered catalog queue is rerendered and a remaining task is opened
- **THEN** returning restores the same search and category.

#### Scenario: Existing lesson sequence
- **WHEN** the student follows the existing L200 to L201 link
- **THEN** L201 retains the original return destination.

### Requirement: Queue mutations survive storage failures in the session
The queue SHALL retain consecutive task mutations in memory when browser storage is unavailable or a storage operation fails; reset SHALL clear that in-memory state.

#### Scenario: Two consecutive task completions
- **WHEN** storage operations throw and two tasks are completed
- **THEN** both remain completed for the page session and neither reappears after changing K.

#### Scenario: Write failure with stale persisted data
- **WHEN** an existing saved state is loaded and a later write fails
- **THEN** subsequent actions use the updated memory state, not the stale persisted state.
