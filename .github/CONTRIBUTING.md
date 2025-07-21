# Contributing to PlayCanvas Editor Testing Suite

Thank you for your interest in contributing to the PlayCanvas Editor Testing Suite! This guide will help you get started with contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing Standards](#testing-standards)
- [Writing Tests](#writing-tests)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)
- [Getting Help](#getting-help)

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 16 or later
- [Git](https://git-scm.com/)
- A GitHub account
- Access to PlayCanvas Editor environment

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/editor-test.git
   cd editor-test
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/playcanvas/editor-test.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Install Playwright browsers**:
   ```bash
   npx playwright install
   ```

6. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Environment Configuration

Configure the following environment variables in your `.env` file:

```env
PC_HOST=playcanvas.com
PC_LOGIN_HOST=login.playcanvas.com
PC_LAUNCH_HOST=launch.playcanvas.com
PC_EMAIL=<playcanvas-email>
PC_PASSWORD=<playcanvas-password>
PC_LOCAL_FRONTEND=<true|false>
```

> [!IMPORTANT]
> The account used must be an existing account. Create one [here](https://login.playcanvas.com)

## Project Structure

The project is organized as follows:

```
editor-test/
├── test/                  # Test files
│   ├── api/               # API-based tests (direct API calls)
│   ├── ui/                # UI interaction tests (browser automation)
│   ├── fixtures/          # Test data and assets
│   ├── auth.setup.ts      # Authentication setup
│   └── clean.setup.ts     # Cleanup operations
├── lib/                   # Test utilities and helpers
│   ├── auth.ts            # Authentication utilities
│   ├── capture.ts         # Error capture utilities
│   ├── common.ts          # Shared test functions
│   ├── config.ts          # Configuration management
│   ├── middleware.ts      # Request middleware
│   └── utils.ts           # General utilities
└── playwright.config.ts   # Playwright configuration
```

## Development Workflow

### Branch Management

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-test-name
   ```

2. **Keep your branch up to date**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Making Changes

1. **Write clear, concise commit messages**:
   ```
   test: add version control merge conflict tests
   
   - Add tests for merge conflict resolution
   - Test both UI and API workflows
   - Include cleanup for test branches
   ```

2. **Test your changes** thoroughly:
   ```bash
   npm test                   # Run all tests
   npm run test:api           # Run API tests only
   npm run test:ui            # Run UI tests only
   ```

3. **Ensure code quality**:
   ```bash
   npm run lint
   npm run type:check
   ```

## Testing Standards

### Test Categories

We have two main categories of tests:

1. **API Tests** (`test/api/`): Direct API calls without UI interaction
2. **UI Tests** (`test/ui/`): Browser automation testing UI workflows

### Test Structure

Tests should follow this structure:

```typescript
import { expect, test, type Page } from '@playwright/test';
import { capture } from '../../lib/capture';
import { createProject, deleteProject } from '../../lib/common';
import { editorBlankUrl } from '../../lib/config';
import { middleware } from '../../lib/middleware';
import { uniqueName } from '../../lib/utils';

test.describe.configure({
    mode: 'serial'  // Use serial mode for related tests
});

test.describe('feature description', () => {
    const projectName = uniqueName('test-prefix');
    let projectId: number;
    let page: Page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await middleware(page.context());
        
        // Setup test data
        await page.goto(editorBlankUrl(), { waitUntil: 'networkidle' });
        projectId = await createProject(page, projectName);
    });

    test.afterAll(async () => {
        // Cleanup
        await deleteProject(page, projectId);
        await page.close();
    });

    test('test description', async () => {
        expect(await capture('test-name', page, async () => {
            // Test implementation
        })).toStrictEqual([]);
    });
});
```

### Error Capture

Always wrap test logic in the `capture` function:

```typescript
expect(await capture('test-identifier', page, async () => {
    // Your test logic here
})).toStrictEqual([]);
```

This captures console errors and helps with debugging.

### Naming Conventions

- Test files: `*.test.ts`
- Test descriptions: Use clear, descriptive names
- Project names: Use `uniqueName()` with a descriptive prefix
- Test identifiers: Use kebab-case for capture identifiers

## Writing Tests

### TypeScript Standards

- Use TypeScript strict mode
- Import types explicitly: `import type { Page } from '@playwright/test'`
- Use meaningful variable and function names
- Add type annotations for complex objects

### Playwright Selectors

Prefer semantic selectors in this order:
1. `getByRole()` - Most robust
2. `getByText()` - For text content
3. `getByTestId()` - For elements with test IDs
4. CSS selectors - As last resort

```typescript
// Good
await page.getByRole('button', { name: 'Create Project' }).click();
await page.getByText('Version Control').click();

// Avoid
await page.locator('.some-complex-css-selector').click();
```

### Async/Await

- Always use `async/await` instead of promises
- Wait for network idle when navigating: `{ waitUntil: 'networkidle' }`
- Use appropriate wait strategies for dynamic content

### Test Independence

- Tests within a describe block can depend on each other (serial mode)
- Different describe blocks should be independent
- Always clean up test data in `afterAll`

### Waiting Strategies

```typescript
// Wait for navigation
await page.goto(url, { waitUntil: 'networkidle' });

// Wait for specific elements
await page.getByText('Loading complete').waitFor({ state: 'visible' });

// Wait for page reloads
await page.waitForLoadState('networkidle');

// Custom waits when needed
await wait(5000); // Use sparingly
```

### Project Management

- Use `uniqueName()` for project names to avoid conflicts
- Always delete temporary projects in `afterAll`
- Store project IDs for cleanup

### Error Handling

- Expect empty error arrays: `toStrictEqual([])`
- Use descriptive test identifiers for debugging
- Check for specific error messages when testing validation

## Submitting Changes

### Pull Request Process

1. **Push your branch** to your fork:
   ```bash
   git push origin feat/your-test-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title describing the test changes
   - Detailed description of what functionality is being tested
   - Test scenarios covered
   - Reference to any related issues

3. **Respond to feedback** promptly and make requested changes

4. **Ensure CI passes** - all tests and linting must pass

### Pull Request Guidelines

- Keep PRs focused and atomic (one feature/area per PR)
- Include both API and UI tests when applicable
- Ensure proper cleanup of test data
- Follow the existing test patterns and structure
- Update documentation as needed

## Reporting Issues

When reporting bugs or requesting test improvements:

1. **Check existing issues** first to avoid duplicates
2. **Use the issue templates** when available
3. **Provide detailed information**:
   - Test scenario that should be covered
   - Steps to reproduce issues
   - Expected vs actual test behavior
   - Browser and environment information
   - Relevant test logs or errors

## Getting Help

- **GitHub Issues**: For bug reports and test requests
- **Discussions**: For questions about testing strategies
- **PlayCanvas Forum**: https://forum.playcanvas.com
- **Discord**: Join the PlayCanvas community Discord

## Development Tips

### Useful Commands

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:api
npm run test:ui

# Run tests in debug mode
npm run test:debug

# Run linting
npm run lint

# Type checking
npm run type:check

# Clean up test projects
npm run test:clean
```

### Common Issues

#### Timing Issues

If tests are flaky due to timing:
- Increase wait times for page loads
- Use more specific wait conditions
- Check for loading states before proceeding

#### Selector Issues

If selectors break frequently:
- Use more semantic selectors (role, text)
- Avoid CSS selectors that depend on implementation
- Add test IDs to the application if needed

#### Authentication

If authentication fails:
- Check environment variables
- Verify credentials
- Clear authentication state and retry

#### Project Conflicts

If project creation fails:
- Ensure unique project names
- Check for leftover projects from failed tests
- Run cleanup script: `npm run test:clean`

### Testing Best Practices

- Test both happy path and error scenarios
- Verify cleanup is working properly
- Use meaningful assertions
- Test cross-browser compatibility when possible
- Consider performance impact of long-running tests

## Recognition

Contributors will be recognized in release notes and the project's contributor list. We appreciate all forms of contribution, from test code to documentation to issue reports.

Thank you for contributing to PlayCanvas Editor Testing Suite! 🧪
