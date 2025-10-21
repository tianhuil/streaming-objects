# Rules for typescript repos

## General

- Use `bun` for package manager (no `npm`, no `yarn`).

## Coding style

- Prefer to write functional code. Prefer `.map`, `.filter`, and `.flatMap` with
  arrays rather than creating an empty array and accumulating.
- Prefer `const` to `let` and mutation. You can often change `let` to `const` by
  wrapping the complex logic in a separate function call (e.g.
  `const val = getVal()`).
- Explicitly type where practicable. Look at the libraries and import and use
  those types; do not make up types.
- Always avoid using type `any`. Try to avoid `unknown` if a known type can be
  gleaned from a library.
- Add docstring to every class and function.
- Any function or class with more than one argument should take a single object
  with named parameters. Function `fooBar` takes type `FooBarParam`, which
  should be defined immediately before `fooBar`. If the object only has a single
  field (e.g. `FooBarParam = {count: number}`) , do not use the object format
  and pass the field to the function directly (e.g. `fooBar(count: number)`).
- When importing, prefer using a sibling absolute import path (e.g.
  `import * from './package/name'`). If not possible, use an absolute import
  path (e.g. `import * from '@/package/name'`). Never use a relative parent
  import path (e.g. `import * from '../package/name'`).

## Validation

- Use `bun run typecheck && bun run check:fix` after each command and fix any
  errors. There may be errors in other files because another agent is working on
  those. Ignore those.
- Use `bun test <test file I'm writing>` for unit testing; Only run tests
  affected by these changes on at the moment. Ignore all other test failures
  (don't try to fix them).
