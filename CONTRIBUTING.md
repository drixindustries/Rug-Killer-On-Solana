# Contributing to Solana Rug Killer

First off, thank you for considering contributing to Solana Rug Killer! It's people like you that make this tool better for the entire Solana community.

## Code of Conduct

This project and everyone participating in it is governed by respect, professionalism, and constructive collaboration. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** - Include links to files or GitHub projects, or copy/pasteable snippets
- **Describe the behavior you observed** and explain what you expected to see instead
- **Include screenshots or animated GIFs** if possible
- **Include your environment details** - OS, Node.js version, browser, etc.

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **A clear and descriptive title**
- **A detailed description of the proposed functionality**
- **Examples of how this enhancement would be used**
- **Why this enhancement would be useful** to most users

### Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Follow the coding standards** outlined below
3. **Write clear commit messages** - Use present tense ("Add feature" not "Added feature")
4. **Test your changes** - Ensure all existing tests pass and add new tests if needed
5. **Update documentation** - Update README.md, code comments, and other docs as needed
6. **Keep pull requests focused** - One feature/fix per PR

## Development Process

### Setting Up Your Development Environment

1. Clone your fork:
```bash
git clone https://github.com/your-username/solana-rug-killer.git
cd solana-rug-killer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables (see README.md)

4. Start the development server:
```bash
npm run dev
```

### Project Structure

```
solana-rug-killer/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utility functions
│   │   └── hooks/       # Custom React hooks
├── server/              # Backend Express application
│   ├── routes.ts        # API route handlers
│   ├── storage.ts       # Database interface
│   ├── token-analysis.ts # Token analysis logic
│   └── bots/            # Telegram/Discord bot logic
├── shared/              # Shared types and schemas
│   └── schema.ts        # Database schema and types
└── docs/                # Documentation files
```

### Coding Standards

#### TypeScript
- Use TypeScript for all new code
- Define types/interfaces for all function parameters and return values
- Avoid `any` type - use proper typing or `unknown`
- Use const assertions where appropriate

#### React/Frontend
- Use functional components with hooks
- Keep components focused and single-purpose
- Use TypeScript interfaces for component props
- Follow the existing pattern for forms (react-hook-form + zod)
- Add data-testid attributes to interactive elements

#### Backend
- Keep route handlers thin - business logic goes in separate modules
- Use the storage interface for all database operations
- Validate all input using Zod schemas
- Return appropriate HTTP status codes
- Include error handling in all async functions

#### Database
- Never modify the database schema manually
- Add migrations using Drizzle Kit: `npm run db:generate`
- Test migrations locally before committing
- Include both up and down migrations

#### Git Commit Messages
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests liberally after the first line

Example:
```
Add holder concentration chart to dashboard

- Implement Recharts pie chart component
- Add tooltip with detailed holder information
- Update dashboard layout to accommodate new chart

Closes #123
```

### Testing

Before submitting a pull request:

1. **Run the linter:**
```bash
npm run lint
```

2. **Check TypeScript types:**
```bash
npm run typecheck
```

3. **Test the application manually:**
   - Test the feature you added/modified
   - Check that existing functionality still works
   - Test on multiple browsers if UI changes

### Documentation

- Update README.md if you change setup instructions
- Add JSDoc comments to all exported functions
- Update API documentation for new/changed endpoints
- Include inline comments for complex logic

## Financial Contributions

We also welcome financial contributions through:
- Holding $RUGK tokens
- Subscribing to premium tiers
- Sponsoring specific features

## Questions?

Don't hesitate to ask questions! You can:
- Open an issue with the "question" label
- Join our Discord server
- Email the maintainers

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
