# AI Agent Instructions

These instructions apply to all work in this repository unless the user explicitly overrides them in a prompt.

## Communication

Be polite, respectful, and appreciative in all interactions.

The user wants to minimize token usage and does not need to see implementation details by default.

Do not provide:

* Plans
* Progress reports
* Reasoning
* Code excerpts
* File contents
* Diffs
* Command output
* Test output
* Implementation summaries
* Lists of changed files
* Root-cause explanations
* Suggestions for additional work

Do not ask for confirmation before making ordinary, reversible implementation decisions.

After successfully completing any task, respond with exactly:

It’s fixed.

Do not add punctuation, explanations, summaries, or additional text.

Only provide detailed results when the user explicitly asks to:

* Show the changes
* Explain the solution
* Display the code
* Display the diff
* Show test results
* Review the implementation
* Provide a summary
* Provide documentation

If the task cannot be completed, respond with only the shortest useful description of the blocker. Do not claim that something is fixed unless it has actually been completed and reasonably validated.

## Primary Objectives

Optimize all work for:

1. Correctness
2. Repairing existing code
3. Low token usage
4. Fast completion
5. Code reusability
6. Maintainability
7. Minimal duplication
8. Safe and targeted changes
9. Efficient testing
10. Efficient future agent sessions

## Existing Code First

Assume the existing code may contain:

* Bugs
* Incomplete implementations
* Broken integrations
* Placeholder logic
* Type errors
* Runtime errors
* Duplicate code
* Poor abstractions
* Dead code
* Incorrect state management
* Missing error handling
* Performance problems
* Outdated patterns
* Weak or missing tests

Inspect and repair the existing implementation instead of creating a parallel replacement.

Do not leave broken code in place while adding a second implementation unless backward compatibility requires it.

Prefer fixing the root cause over adding a workaround.

Only rewrite a component or module when the current implementation is fundamentally unsalvageable or a contained rewrite is safer and simpler than repairing it.

## Repository Exploration

Inspect only the parts of the repository necessary to complete the task safely.

Start with:

* Relevant feature files
* Entry points
* Imports and call sites
* Shared components
* Utilities and services
* State-management code
* API and data-access code
* Types and models
* Configuration files
* Relevant tests
* Available errors or logs

Use code search and references before opening many files.

Do not read the entire repository unless the task genuinely requires it.

Once enough evidence exists to implement the correct solution, stop exploring and begin the repair.

Do not repeatedly reread unchanged files.

## Root-Cause Debugging

When repairing a problem:

1. Identify or reproduce the failure.
2. Trace the affected execution path.
3. Locate the earliest incorrect assumption, value, state change, configuration, or dependency.
4. Repair the root cause.
5. Remove obsolete workarounds.
6. Add or update regression coverage when practical.
7. Validate the affected flow.

Do not:

* Add arbitrary delays to hide race conditions
* Swallow exceptions
* Use empty catch blocks
* Disable tests to make the build pass
* Use unsafe casts to hide type problems
* Duplicate state to work around state bugs
* Hardcode values to bypass broken logic
* Replace production integrations with mock data
* Comment out broken behavior without replacing it
* Ignore rejected promises
* Silence warnings without understanding them

## Token-Efficient Work

Minimize unnecessary context and output.

* Read targeted file sections rather than entire large files.
* Use search, imports, references, and call sites to find relevant code.
* Batch related edits.
* Avoid repeatedly explaining the task.
* Avoid speculative analysis.
* Avoid unnecessary comments and documentation.
* Avoid generating files that are not required.
* Avoid broad refactors when a focused repair is sufficient.
* Run focused tests before broad test suites.
* Do not repeatedly run the same command without a reason.
* Do not delegate overlapping work to multiple subagents.
* Do not ask the user questions when a safe, reasonable decision can be inferred.
* Keep internal plans brief.
* Keep user-facing output to the minimum required by the Communication section.

## Reusability

Before adding new code, search for existing:

* Components
* Hooks
* Helpers
* Services
* API clients
* Types
* Models
* Constants
* Validators
* Formatters
* Styles
* Design tokens
* State-management patterns
* Error-handling patterns
* Test utilities

Repair or extend appropriate existing abstractions.

Create a reusable abstraction when:

* Logic is duplicated
* The same behavior is used in multiple places
* A shared responsibility is clear
* It meaningfully simplifies future changes
* It improves testing
* It prevents the same defect from recurring

Do not create speculative abstractions for trivial single-use logic.

Prefer composition and configuration over copied implementations.

## Architecture

Maintain separation between:

* Presentation
* Business logic
* State management
* Data access
* Network requests
* Validation
* Platform-specific behavior
* Shared design systems
* Error handling
* Tests and fixtures

Avoid introducing:

* Oversized components
* God classes
* Deeply nested logic
* Hidden side effects
* Circular dependencies
* Repeated API logic
* Scattered hardcoded values
* Business logic inside presentation components
* Tight coupling
* Redundant state

Do not restructure unrelated parts of the architecture.

## Code Quality

Produce code that is:

* Correct
* Readable
* Strongly typed where supported
* Predictable
* Testable
* Accessible
* Secure by default
* Consistent with the repository
* Defensive around external data and failure states

Use descriptive names instead of excessive comments.

Comments should explain why unusual behavior is necessary, not narrate obvious code.

Remove directly related:

* Dead code
* Unused imports
* Duplicate logic
* Temporary debugging statements
* Commented-out implementations
* Redundant state
* Obsolete workarounds
* Unnecessary dependencies
* Avoidable repeated computation

Preserve unrelated working behavior.

## Dependencies

Before installing a dependency, determine whether:

* The platform already provides the functionality
* The repository already contains a suitable dependency
* Existing code can be repaired instead
* A small local implementation would be simpler
* The dependency provides meaningful long-term value

Do not add a package for trivial functionality.

When adding or upgrading a dependency:

* Confirm compatibility
* Check for breaking changes
* Update affected configuration and code
* Run relevant validation

## Performance

Check the affected flow for meaningful issues such as:

* Duplicate network requests
* Unnecessary requests
* Missing request cancellation
* Unbounded retries
* Blocking operations
* Excessive renders
* Unstable dependencies
* Repeated transformations
* Memory leaks
* Main-thread work
* Unbounded lists
* Missing safe caching
* Oversized assets or bundles

Do not sacrifice correctness or readability for minor theoretical optimization.

## UI and Design Systems

Reuse existing:

* Colors
* Typography
* Spacing
* Corner radii
* Shadows
* Icons
* Buttons
* Inputs
* Cards
* Navigation patterns
* Responsive breakpoints
* Loading states
* Empty states
* Error states

Do not scatter new hardcoded visual values.

When relevant, include:

* Loading behavior
* Empty states
* Error states
* Disabled states
* Success feedback
* Accessibility support
* Responsive behavior

Preserve the existing design language unless the task explicitly requests a redesign.

## Testing and Validation

Use the narrowest meaningful validation first:

1. Reproduce or identify the issue
2. Static analysis or type checking
3. Focused unit tests
4. Focused integration or UI tests
5. Build validation
6. Manual verification of the affected flow
7. Broader test suites when justified

Add or update tests for:

* The root cause
* Bug fixes
* Critical business behavior
* Shared logic
* Validation rules
* Important failure states
* Regression-prone behavior

Do not:

* Delete tests solely to make validation pass
* Weaken meaningful assertions without justification
* Replace useful tests with shallow snapshots
* Claim validation succeeded when it was not run
* Claim the entire repository passes when only focused tests passed

Handle pre-existing unrelated failures separately and do not expand the task unless they block the requested work.

## Scope Control

Fix issues directly related to the requested task.

A nearby issue may also be fixed without asking when it:

* Shares the same root cause
* Is clearly defective
* Has low implementation risk
* Can be covered by the same validation

Do not turn a focused task into unrelated repository cleanup.

## Decision-Making

When multiple solutions are valid, choose the one that:

1. Fixes the root cause
2. Repairs existing code
3. Reuses appropriate code
4. Requires the fewest safe changes
5. Adds the least complexity
6. Preserves unrelated behavior
7. Is easy to test
8. Is easy for future agents and developers to understand
9. Minimizes maintenance
10. Avoids unnecessary dependencies

Make sensible implementation decisions autonomously.

Ask a question only when missing information would materially affect:

* Functionality
* Data integrity
* Security
* Irreversible behavior
* Major architecture
* An external service or credential that cannot be inferred

## Completion

Before marking a task fixed:

* Review the final diff
* Confirm only relevant files changed
* Confirm the root cause was addressed
* Remove temporary debugging code
* Remove obsolete workarounds
* Confirm imports and references are valid
* Update affected call sites
* Run relevant validation
* Confirm no unnecessary abstractions were added
* Confirm no unnecessary dependencies were added
* Verify the affected behavior as thoroughly as the environment allows

After successful completion, follow the Communication section and respond with exactly:

It’s fixed.

# Project-Specific Rules

## Expo

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Safe-area rule

The device clock, status bar, camera cutout, and Dynamic Island are a strict
non-scrolling boundary. Keep every route inside the shared `AppSafeArea`
navigation shell. Never put the top safe-area inset inside a `ScrollView`,
`FlatList`, or `SectionList` content container. Any native full-screen `Modal`,
which renders outside the navigation shell, must apply `insets.top` to a
non-scrolling parent before its scrollable content.

## Date-field rule

All editable calendar dates must use the shared design-system `DateField`.
Never use `Input`, `TextInput`, or duplicated parsing/formatting for a date.
`DateField` owns the native iOS calendar popover, Android calendar dialog,
browser date control, date limits, locale display, and conversion to the
timezone-safe `YYYY-MM-DD` storage key.

## App-prompt rule

All app-owned alerts, confirmations, and action sheets must use the shared
design-system `appPrompt` and `AppPromptHost`. Never import or call React
Native `Alert` or `ActionSheetIOS` for app UI. The shared prompt owns the
editorial styling, dark mode, destructive/cancel states, accessibility, and
safe-area behavior. Operating-system permission and security dialogs are the
only exception because their appearance is controlled by the platform.
App-owned prompts and modals must represent cancel or dismiss actions with an
accessible X button in the top-right, never a full-width cancel action.
