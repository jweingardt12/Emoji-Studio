# Testing Guide for Emoji Studio

## What Are Unit Tests?

Unit tests are automated checks that verify your code works correctly. Think of them as:
- **Safety nets** that catch bugs before users do
- **Documentation** that shows how your code should work
- **Confidence boosters** when making changes

## Why Do We Test?

1. **Catch Bugs Early** - Find problems during development, not in production
2. **Prevent Regressions** - Ensure new changes don't break existing features
3. **Document Behavior** - Tests show how functions should be used
4. **Enable Refactoring** - Change code confidently knowing tests will catch issues

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for a specific file
npm test emoji-processor.test.ts
```

## Test Structure

Each test follows the **AAA Pattern**:

```javascript
it('should do something specific', () => {
  // Arrange - Set up test data
  const input = 'test data'
  
  // Act - Run the code being tested
  const result = functionToTest(input)
  
  // Assert - Check the result
  expect(result).toBe('expected output')
})
```

## What We Test

### 1. **Utility Functions** (`__tests__/lib/utils/`)
- Parse Slack curl commands
- Process emoji images
- Format dates and data

### 2. **Services** (`__tests__/lib/services/`)
- CRUD operations (Create, Read, Update, Delete)
- API calls
- Data transformations

### 3. **Components** (`__tests__/components/`)
- Rendering with correct data
- User interactions (clicks, typing)
- Error states
- Loading states

### 4. **API Endpoints** (`__tests__/app/api/`)
- Request handling
- Response formats
- Error handling
- Authentication

## Common Testing Patterns

### Testing Async Functions
```javascript
it('should handle async operations', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})
```

### Testing Errors
```javascript
it('should throw error for invalid input', async () => {
  await expect(functionThatThrows())
    .rejects
    .toThrow('Expected error message')
})
```

### Testing UI Components
```javascript
it('should handle user click', async () => {
  render(<Button onClick={mockHandler}>Click me</Button>)
  
  const button = screen.getByText('Click me')
  await userEvent.click(button)
  
  expect(mockHandler).toHaveBeenCalledOnce()
})
```

### Mocking External Dependencies
```javascript
// Mock fetch for API tests
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'mocked' })
})
```

## Best Practices

1. **Test One Thing** - Each test should verify a single behavior
2. **Use Descriptive Names** - Test names should explain what they verify
3. **Keep Tests Simple** - If a test is complex, the code might need refactoring
4. **Test Edge Cases** - Don't just test the happy path
5. **Mock External Services** - Tests shouldn't depend on network/database

## Coverage Goals

Aim for:
- **80%+ overall coverage** - Most code should be tested
- **100% for critical paths** - Authentication, payments, data processing
- **Focus on behavior** - Don't chase 100% coverage blindly

## Debugging Failed Tests

1. **Read the error message** - Jest provides detailed failure information
2. **Use `console.log`** - Add logs to understand test flow
3. **Run single test** - Use `.only` to focus on one test
4. **Check mocks** - Ensure mocks return expected data

```javascript
// Focus on single test
it.only('should debug this test', () => {
  console.log('debugging info')
  // test code
})
```

## Adding New Tests

When adding features:
1. Write tests first (TDD - Test Driven Development)
2. Ensure tests fail initially
3. Implement feature until tests pass
4. Refactor with confidence

## Test Files We Created

- `parse-slack-curl.test.ts` - Tests URL parsing and token extraction
- `emoji-processor.test.ts` - Tests image processing and validation
- `emoji-service.test.ts` - Tests CRUD operations
- `emoji-grid.test.tsx` - Tests UI component behavior
- `slack-emojis.test.ts` - Tests API endpoint

## Next Steps

1. Run `npm test` to see all tests pass
2. Try `npm run test:coverage` to see code coverage
3. Modify a test to see it fail
4. Add a new test for a feature you want to implement

Remember: Good tests make good software! 🧪✨