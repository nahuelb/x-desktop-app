# Code Standards

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

Biome (via Ultracite) enforces formatting and linting. Run `pnpm run fix` before committing.

## Key Conventions

- Prefer `unknown` over `any`; use type narrowing instead of assertions
- `async/await` over promise chains; always `await` in async functions
- `const` by default, `let` only when needed, never `var`
- `for...of` over `.forEach()`; optional chaining (`?.`) and nullish coalescing (`??`)
- Early returns over nested conditionals
- React 19: use `ref` as a prop (no `forwardRef`); function components only; hooks at top level only
- No `console.log` / `debugger` / `alert` in production code

## Code Organization

- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code
