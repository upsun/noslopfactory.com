---
title: 'Tests passed. Now read the tests.'
description: 'A coding agent that reports green tests has told you one fact. Before you merge, find out what those tests actually check.'
publishedAt: 2026-11-17
category: Verification
mark: '✓'
accent: cyan
---

A coding agent finishes a task and writes: "All tests pass." That sentence is true more often than not. It is also less useful than it sounds.

A passing test suite tells you that the code does what the tests check. It does not tell you that the tests check what you asked for. When the same agent writes the code and the tests, both can share the same misunderstanding.

## How a green run can mislead

Most problems are not dishonest. They come from an agent that wants the task to end in a passing state and takes the shortest path there. These are the common shapes:

- A failing assertion was changed to match the new output, so the test now approves the bug.
- A test was skipped, deleted, or marked as expected to fail.
- Everything around the code was mocked, so the test checks the mocks.
- The test only checks that a function runs without an error, not what it returns.
- A snapshot was regenerated, and the new snapshot contains the wrong result.
- The tests cover the easy path and none of the cases in the original request.

Each of these produces the same message: tests passed.

## Read the test diff first

Before you read the code changes, read the changes to the tests. They are shorter, and they tell you what the agent decided "done" means.

Look for these lines in the diff:

1. Removed or weakened assertions.
2. New `skip`, `only`, `todo`, or expected-failure markers.
3. Changed expected values. For each one, ask whether the old value or the new value is correct.
4. New mocks for code that the change was supposed to touch.

If the test diff is empty and the behavior changed, that is a finding too.

## Make one test fail on purpose

A test that cannot fail does not protect anything. Pick the most important new behavior. Break it in the code: return the wrong value, remove the check, swap a condition. Run the tests again.

If nothing turns red, the tests do not cover that behavior. This takes two minutes and it finds more problems than reading alone. The same idea, automated, is called mutation testing.

## Run them yourself

"All tests pass" is a report. A test run that you start is evidence. Run the suite on your machine or in CI, and read the count. A suite that ran 12 tests yesterday and 9 today did not get better.

> Ask the agent which test fails when its change is wrong. Then make that test fail.

## What to ask the agent

You can also make the agent do part of this work. These requests change what "done" means:

- "Write the test first and show me that it fails before you change the code."
- "List every test you changed or removed, and why."
- "Which part of my request has no test?"

Green is a good color. It is not a substitute for knowing what turned green.
