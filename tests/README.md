# Tests for /api/sync Route

This directory contains comprehensive tests for the `/api/sync` route, testing various sync scenarios with mocked external API calls.

## Test Setup

The tests use:

- **Vitest** for the test framework
- **MSW (Mock Service Worker)** for mocking HTTP requests to external APIs
- **vitest-mock-extended** for mocking Prisma database calls
- **Custom test factories** for creating test data

## Test Coverage

### 1. Authentication Tests

- Missing authorization header (401)
- Invalid bearer token format (401)
- Non-existent user API key (401)

### 2. CRON Secret Authentication - Full Sync

- **Successful full sync**: Tests the complete sync process for multiple users when triggered via CRON_SECRET
- **Error handling**: Tests graceful handling of database errors during full sync

### 3. Single User Sync - Fully Configured User with No Paired Group

- **Successful single user sync**: Tests sync for a fully configured user not in a paired group
- **Incomplete configuration**: Tests 403 response for users without complete YNAB/Splitwise setup
- **Rate limiting**: Tests the rate limiting functionality (429 response)

### 4. Paired Group Sync - Two Fully Configured Users

- **Successful paired group sync**: Tests two-phase sync process for users in the same Splitwise group
- **Error handling**: Tests error scenarios in paired group sync

### 5. Error Scenarios

- **Splitwise API errors**: Tests handling of external API failures with graceful degradation

## Mocked External Services

The tests mock **ONLY** the HTTP requests to external APIs, not internal services:

### Splitwise API Endpoints:

- `GET /api/v3.0/get_expenses` - Fetching expenses
- `POST /api/v3.0/create_expense` - Creating new expenses
- `GET /api/v3.0/get_group/:groupId` - Getting group details
- `POST /api/v3.0/update_expense/:expenseId` - Updating expenses

### YNAB API Endpoints:

- `GET /budgets/:budgetId/transactions` - Fetching transactions
- `POST /budgets/:budgetId/transactions` - Creating transactions
- `PATCH /budgets/:budgetId/transactions/:transactionId` - Updating transactions

## Running Tests

### Install Dependencies

```bash
npm install
```

### Known Issue: PostCSS Configuration

Currently, there's a PostCSS configuration issue that prevents the tests from running. This is due to a conflict between the Tailwind PostCSS plugin and Vitest's CSS processing.

**Temporary Fix**: Update `postcss.config.mjs` to handle test environment:

```javascript
const config = {
  plugins: process.env.NODE_ENV === "test" ? [] : ["@tailwindcss/postcss"],
};

export default config;
```

### Run Tests

```bash
# Run all tests in watch mode
npm run test

# Run all tests once
npm run test:run

# Run tests with UI
npm run test -- --ui

# Run specific test file
npm run test tests/api/sync.test.ts

# Run specific test by name
npm run test -t "test name"
```

### Test Structure

```
tests/
├── setup.ts                 # Test environment setup
├── factories/
│   └── test-data.ts         # Test data factories
├── mocks/
│   └── handlers.ts          # MSW HTTP request handlers
├── api/
│   └── sync.test.ts         # Main test file
└── README.md                # This file
```

## Test Data Factories

The `tests/factories/test-data.ts` file contains helper functions for creating test data:

- `createTestUser()` - Creates test user objects
- `createTestAccount()` - Creates YNAB/Splitwise account objects
- `createTestSplitwiseSettings()` - Creates Splitwise configuration
- `createTestYnabSettings()` - Creates YNAB configuration
- `createPairedGroupUsers()` - Creates two users in the same Splitwise group

## Mock Data

The tests use realistic mock data that matches the actual API responses:

- Mock Splitwise expenses with proper repayments structure
- Mock YNAB transactions with correct milliunits formatting
- Mock group members with complete user profiles
- Mock API responses that match the actual service schemas

## Environment Variables

The tests set up the following environment variables:

- `CRON_SECRET=test-cron-secret` - For testing CRON-triggered full sync
- `NEXTAUTH_SECRET=test-nextauth-secret` - For NextAuth functionality

## Database Mocking

All database operations are mocked using `vitest-mock-extended`, allowing tests to run without a real database connection while still testing the complete sync logic.

## What's NOT Mocked

- The actual sync route handler (`/app/api/sync/route.ts`)
- Internal service classes (SplitwiseService, YNABService)
- Business logic and data transformation
- Rate limiting logic
- Database query construction
- Error handling and retry logic

This approach ensures that the tests validate the complete integration flow while remaining fast and reliable by avoiding external dependencies.
