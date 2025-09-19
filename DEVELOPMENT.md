# Code Quality & Development Guide

This document outlines the code quality tools and processes set up for the GameBacklog project.

## 🛠️ Tools & Technologies

### Code Formatting
- **Prettier**: Automatic code formatting
- **ESLint**: Code linting and quality rules
- **TypeScript**: Type checking and compilation

### Testing
- **Jest**: Testing framework (API)
- **Supertest**: HTTP testing (API)
- **Coverage**: Code coverage reporting

### CI/CD
- **GitHub Actions**: Automated testing and quality checks
- **Multi-job workflows**: Parallel execution for faster feedback

## 📝 Available Scripts

### API (`/api`)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run type-check   # Check TypeScript types
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Dev Dashboard (`/devdashboard`)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run type-check   # Check TypeScript types
npm run test         # Run tests (placeholder)
npm run preview      # Preview production build
```

### User Dashboard (`/user-dashboard`)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run type-check   # Check TypeScript types
npm run test         # Run tests (placeholder)
npm run preview      # Preview production build
```

## 🔄 Development Workflow

### Before Committing
1. **Format your code**: `npm run format`
2. **Fix linting issues**: `npm run lint:fix`
3. **Check types**: `npm run type-check`
4. **Run tests**: `npm run test`

### Quick Quality Check
```bash
# Run all quality checks at once
npm run format:check && npm run lint && npm run type-check && npm run test
```

## 🚀 GitHub Actions Workflows

### Main CI/CD Pipeline (`.github/workflows/ci.yml`)
Runs on every push and PR to `main` and `dev` branches:

1. **Code Quality Job**:
   - ✅ Code formatting check (Prettier)
   - ✅ Linting (ESLint)
   - ✅ Type checking (TypeScript)
   - ✅ Security audit (npm audit)

2. **Build & Test Job**:
   - ✅ Install dependencies
   - ✅ Build all projects
   - ✅ Run tests
   - ✅ Upload build artifacts

3. **Additional Checks Job**:
   - ✅ Scan for TODO/FIXME comments
   - ✅ Check for large files
   - ✅ Look for potential secrets

4. **Dependency Analysis Job**:
   - ✅ Check for outdated packages
   - ✅ Analyze dependency tree

### Quality Report (`.github/workflows/quality-report.yml`)
Generates detailed quality reports:
- 📊 Test coverage
- 📈 Code quality metrics
- 💬 PR comments with status

## 📊 Code Quality Standards

### ESLint Rules
- **TypeScript**: Strict type checking
- **Code Quality**: Prefer const, no var, consistent formatting
- **Security**: No console.log in production, proper error handling
- **Import Organization**: Sorted imports

### Prettier Configuration
- **Semicolons**: Required
- **Quotes**: Single quotes
- **Print Width**: 80 characters
- **Tab Width**: 2 spaces
- **Trailing Commas**: ES5 compatible

### Type Checking
- **Strict Mode**: Enabled
- **No Implicit Any**: Enforced
- **Unused Variables**: Error (except when prefixed with _)

## 🧪 Testing Strategy

### API Testing
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Coverage**: Minimum 70% target (not enforced yet)

### Frontend Testing
- **Component Tests**: React component testing (to be added)
- **E2E Tests**: Full user flow testing (to be added)

## 🔒 Security

### Dependency Management
- **Automated Audits**: Run on every CI build
- **High Severity**: Fails the build
- **Regular Updates**: Check for outdated packages

### Code Scanning
- **Secret Detection**: Scans for potential API keys/passwords
- **Pattern Matching**: Looks for common security anti-patterns

## 💡 Best Practices

### Code Style
1. Use meaningful variable names
2. Write self-documenting code
3. Add comments for complex logic
4. Keep functions small and focused

### Git Workflow
1. Create feature branches from `dev`
2. Make small, focused commits
3. Write clear commit messages
4. Ensure CI passes before merging

### Performance
1. Monitor bundle sizes
2. Use TypeScript for better IntelliSense
3. Implement proper error handling
4. Log appropriately (not in production)

## 🚨 Troubleshooting

### Common Issues

**ESLint errors**: 
```bash
npm run lint:fix
```

**Formatting issues**:
```bash
npm run format
```

**Type errors**:
```bash
npm run type-check
```

**Failed tests**:
```bash
npm run test:watch
```

### CI/CD Issues
- Check the Actions tab on GitHub
- Review error logs for specific failures
- Ensure all dependencies are properly installed
- Verify environment variables are set

## 📚 Resources

- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Jest Documentation](https://jestjs.io/docs/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## 🎯 Future Improvements

- [ ] Add E2E testing with Playwright
- [ ] Implement visual regression testing
- [ ] Set up automated dependency updates
- [ ] Add performance monitoring
- [ ] Implement semantic versioning
- [ ] Add Docker container scanning
- [ ] Set up staging deployments