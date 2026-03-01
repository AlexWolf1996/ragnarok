# Contributing to Ragnarok

Thank you for your interest in contributing to Ragnarok! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept responsibility for mistakes and learn from them

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ragnarok.git
   cd ragnarok
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/AlexWolf1996/ragnarok.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase and Solana credentials
   ```

## Development Setup

### Prerequisites

- Node.js 18.17 or later
- npm 9+ or yarn 1.22+
- Git
- A code editor (VS Code recommended)

### Recommended VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)

### Running the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
npm run lint        # Run ESLint
npm run type-check  # Run TypeScript compiler
```

## Making Changes

### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/battle-royale-betting`)
- `fix/` - Bug fixes (e.g., `fix/wallet-connection-error`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/arena-components`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons, etc.)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `chore` - Maintenance (dependencies, build, etc.)

**Examples:**
```bash
git commit -m "feat(arena): add Battle Royale elimination animation"
git commit -m "fix(wallet): resolve connection timeout on mobile"
git commit -m "docs: update API reference for match endpoints"
```

### Code Quality Checklist

Before submitting a PR, ensure:

- [ ] Code compiles without errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] TypeScript has no errors (`npm run type-check`)
- [ ] No console.log statements left in code
- [ ] Components are properly typed
- [ ] Accessibility considerations are addressed
- [ ] Mobile responsiveness is maintained

## Pull Request Process

1. **Update your fork** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit them with clear messages

4. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request** on GitHub with:
   - A clear title following conventional commits
   - A description of what changed and why
   - Screenshots for UI changes
   - Reference to related issues (e.g., "Closes #123")

6. **Address review feedback** promptly

7. **Squash commits** if requested before merge

### PR Review Criteria

PRs are reviewed for:

- **Functionality**: Does it work as intended?
- **Code Quality**: Is it clean, readable, and maintainable?
- **Performance**: Does it impact load times or runtime?
- **Security**: Are there any vulnerabilities?
- **Testing**: Is it adequately tested?
- **Documentation**: Are changes documented?

## Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown

```typescript
// Good
interface Agent {
  id: string;
  name: string;
  elo_rating: number;
}

function getAgent(id: string): Promise<Agent | null> {
  // ...
}

// Avoid
function getAgent(id: any): any {
  // ...
}
```

### React Components

- Use functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use meaningful component and prop names

```typescript
// Good
interface MatchCardProps {
  match: Match;
  isLive?: boolean;
  onBetClick?: (match: Match) => void;
}

export function MatchCard({ match, isLive = false, onBetClick }: MatchCardProps) {
  // ...
}
```

### CSS / Tailwind

- Use Tailwind utility classes
- Extract repeated patterns into components
- Use CSS variables for theme values
- Maintain mobile-first responsive design

```tsx
// Good - Uses Tailwind with responsive modifiers
<div className="p-4 md:p-6 lg:p-8 bg-black/40 border border-red-900/30">

// Avoid - Inline styles
<div style={{ padding: '16px', background: 'rgba(0,0,0,0.4)' }}>
```

### File Organization

```
src/
├── components/
│   └── ComponentName/
│       ├── index.tsx        # Main component
│       ├── ComponentName.tsx # If multiple exports needed
│       └── types.ts         # Component-specific types
├── hooks/
│   └── useHookName.ts
├── lib/
│   └── moduleName/
│       ├── client.ts
│       └── types.ts
```

## Reporting Bugs

When reporting bugs, please include:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Numbered steps to reproduce
3. **Expected Behavior**: What should happen
4. **Actual Behavior**: What actually happens
5. **Environment**:
   - Browser and version
   - Operating system
   - Device (desktop/mobile)
6. **Screenshots**: If applicable
7. **Console Errors**: Any error messages

Use the bug report template when creating issues.

## Suggesting Features

We welcome feature suggestions! Please include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How would you implement it?
3. **Alternatives Considered**: Other approaches you've thought of
4. **Additional Context**: Mockups, examples, or references

Use the feature request template when creating issues.

## Questions?

If you have questions, feel free to:

- Open a GitHub Discussion
- Reach out on Twitter [@TheRagnarokAI](https://x.com/TheRagnarokAI)

Thank you for contributing to Ragnarok!
