# Going Bananas Backend Test Suite

## Overview

This directory contains comprehensive test suites for the Going Bananas T&C Analyzer backend API, with special focus on the personalization system. The tests ensure reliability, performance, and correctness of all personalization features.

**Author**: Aban Hasan (thewildofficial)  
**Version**: 1.0.0

## Test Structure

### Core Test Files

- **`personalization.test.js`** - Complete personalization service and API tests
- **`geminiPersonalization.test.js`** - AI integration and prompt personalization tests
- **`setup.js`** - Test environment configuration and utilities
- **`README.md`** - This documentation file

### Test Categories

#### 1. Schema Validation Tests
- Joi schema validation for all personalization data structures
- Edge case validation (invalid data, missing fields, boundary values)
- Complex nested object validation
- Array validation with custom constraints

#### 2. PersonalizationService Tests
- Profile management (save, retrieve, update, delete)
- Risk tolerance computation algorithms
- Alert threshold calculation
- Explanation style determination
- Profile tag generation
- Personalization insights generation

#### 3. GeminiPersonalizationService Tests
- Prompt template system validation
- Personalized prompt generation
- System prompt building with user context
- Analysis instructions customization
- Demographic adaptation logic
- Analysis result personalization
- Personalized explanations and recommendations

#### 4. API Route Tests
- All personalization endpoints (POST, GET, PATCH, DELETE)
- Request/response validation
- Error handling and status codes
- Authentication and authorization
- Performance and timeout handling

#### 5. Integration Tests
- End-to-end personalization workflow
- Service integration points
- Database operations (when implemented)
- External API integration (Gemini AI)

#### 6. Performance Tests
- Response time benchmarks
- Memory usage monitoring
- Concurrent request handling
- Cache effectiveness
- Scalability testing

#### 7. Edge Case and Error Handling Tests
- Invalid input handling
- Service unavailability scenarios
- Resource constraint handling
- Concurrent operation safety
- Data consistency validation

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install dev dependencies for testing
npm install --only=dev
```

### Test Commands

```bash
# Run all tests
npm test

# Run tests with file watching
npm run test:watch

# Run only personalization service tests
npm run test:personalization

# Run only Gemini AI integration tests
npm run test:gemini

# Run tests with coverage reporting
npm run test:coverage

# Run specific test file
npx mocha tests/personalization.test.js --timeout 10000

# Run specific test suite
npx mocha tests/personalization.test.js --grep "Schema Validation"

# Run tests in verbose mode
npx mocha tests/**/*.test.js --reporter spec --timeout 10000
```

### Environment Setup

Tests automatically configure the environment:

```javascript
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.MOCK_GEMINI_API = 'true';
```

## Test Utilities and Fixtures

### Global Test Fixtures

The test suite provides pre-configured test data:

```javascript
// Access via global.testFixtures
const validProfile = global.testFixtures.validUserProfile;
const sampleTerms = global.testFixtures.sampleTermsText;
const mockAnalysis = global.testFixtures.mockAnalysisResult;
```

### Test Utilities

Helper functions for common test operations:

```javascript
// Access via global.testUtils
const profile = global.testUtils.createTestProfile({ occupation: 'student' });
const analysis = global.testUtils.createMockAnalysis({ risk_score: 8.0 });
global.testUtils.validateComputedProfile(computedProfile);
```

### Custom Assertions

Extended validation functions:

```javascript
const { expectValidComputedProfile } = require('./personalization.test.js');
expectValidComputedProfile(result.computedProfile);
```

## Test Coverage Requirements

### Target Coverage Metrics

- **Line Coverage**: ≥90%
- **Function Coverage**: ≥95%
- **Branch Coverage**: ≥85%
- **Statement Coverage**: ≥90%

### Coverage Areas

#### PersonalizationService Coverage
- ✅ Profile validation and saving
- ✅ Risk tolerance computation
- ✅ Alert threshold calculation
- ✅ Explanation style determination
- ✅ Profile tag generation
- ✅ Insights generation
- ✅ Error handling and edge cases

#### GeminiPersonalizationService Coverage
- ✅ Prompt template initialization
- ✅ Personalized prompt building
- ✅ System prompt construction
- ✅ Analysis instructions generation
- ✅ Demographic adaptations
- ✅ Result personalization
- ✅ Explanation customization

#### API Routes Coverage
- ✅ All HTTP methods (GET, POST, PATCH, DELETE)
- ✅ Request validation
- ✅ Response formatting
- ✅ Error status codes
- ✅ Performance monitoring

## Test Data and Mocking

### Mock Data Strategy

1. **Realistic Test Profiles**: Representative user demographics and preferences
2. **Boundary Value Testing**: Edge cases for all numeric and string fields
3. **Invalid Data Testing**: Malformed requests and data validation
4. **Performance Data**: Large datasets for scalability testing

### Gemini AI Mocking

```javascript
// Automatic mocking in test environment
process.env.MOCK_GEMINI_API = 'true';

// Manual mocking for specific tests
const geminiStub = sinon.stub(geminiService, 'callGeminiWithRetry')
  .resolves(mockGeminiResponse);
```

### Database Mocking

Currently using in-memory storage for tests. Future database integration will include:

- Database connection mocking
- Transaction rollback for test isolation
- Fixture data loading
- Cleanup procedures

## Performance Benchmarks

### Target Performance Metrics

| Operation | Target Time | Current |
|-----------|-------------|---------|
| Profile Save | <500ms | ~200ms |
| Profile Retrieval | <100ms | ~15ms |
| Risk Computation | <200ms | ~50ms |
| Prompt Generation | <300ms | ~100ms |
| API Response | <1000ms | ~400ms |

### Memory Usage Limits

- **Single Profile**: <1MB memory usage
- **100 Profiles**: <100MB total memory
- **Computation**: <50MB peak memory
- **API Request**: <10MB per request

## Debugging Tests

### Common Issues and Solutions

#### Test Timeouts
```bash
# Increase timeout for slow tests
npx mocha tests/personalization.test.js --timeout 15000
```

#### Memory Issues
```bash
# Monitor memory usage during tests
node --max-old-space-size=2048 node_modules/.bin/mocha tests/**/*.test.js
```

#### Async Issues
```javascript
// Ensure proper async handling
it('should handle async operations', async function() {
  const result = await asyncOperation();
  expect(result).to.exist;
});
```

#### Stub/Mock Issues
```javascript
// Always restore stubs in afterEach
afterEach(function() {
  sinon.restore();
});
```

### Debug Mode

Enable verbose logging for debugging:

```javascript
// In test files
process.env.LOG_LEVEL = 'debug';
process.env.NODE_ENV = 'development';
```

## Continuous Integration

### CI Configuration

The test suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions configuration
- name: Run Tests
  run: |
    npm install
    npm run test:coverage
    npm run lint

- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
```

### Test Requirements for PR

All pull requests must:

1. ✅ Pass all existing tests
2. ✅ Maintain ≥90% code coverage
3. ✅ Include tests for new features
4. ✅ Pass linting requirements
5. ✅ Include performance benchmarks for new APIs

## Contributing to Tests

### Adding New Tests

1. **Follow Naming Convention**: `describe` blocks use feature names, `it` blocks use behavior descriptions
2. **Use Fixtures**: Leverage global test fixtures for consistency
3. **Test Edge Cases**: Include boundary values and error conditions
4. **Performance Awareness**: Add performance assertions for new features
5. **Documentation**: Comment complex test logic

### Test File Template

```javascript
/**
 * Test Suite for [Feature Name]
 * 
 * [Description of what this test suite covers]
 * 
 * @fileoverview [Brief description]
 * @author Aban Hasan (thewildofficial)
 * @version 1.0.0
 */

const { expect } = require('chai');
const sinon = require('sinon');

describe('[Feature Name] Test Suite', function() {
  this.timeout(10000);

  let serviceInstance;

  before(function() {
    // Setup
  });

  after(function() {
    // Cleanup
  });

  describe('[Sub-feature]', function() {
    it('should [expected behavior]', function() {
      // Test implementation
    });
  });
});
```

## Test Maintenance

### Regular Maintenance Tasks

1. **Update Test Data**: Keep fixtures current with schema changes
2. **Performance Monitoring**: Update benchmark expectations
3. **Dependency Updates**: Keep test dependencies current
4. **Coverage Analysis**: Regular coverage report review
5. **Flaky Test Investigation**: Monitor and fix unstable tests

### Deprecation Strategy

When retiring tests:

1. Mark as deprecated with clear timeline
2. Provide migration path for dependent tests
3. Update documentation
4. Remove after appropriate notice period

## Troubleshooting

### Common Test Failures

#### Schema Validation Errors
- Check that test data matches current schema requirements
- Verify Joi validation logic changes
- Update fixture data for new required fields

#### Service Integration Errors
- Verify mock setup and teardown
- Check async operation handling
- Validate service dependencies

#### Performance Test Failures
- Monitor system resource usage during tests
- Check for memory leaks in test setup
- Verify timing assertions are realistic

### Getting Help

1. Check test output for specific error messages
2. Review recent changes in related service files
3. Verify test environment setup
4. Contact: Aban Hasan (thewildofficial) for complex issues

---

**Test Suite Quality**: Comprehensive, maintainable, and reliable  
**Last Updated**: January 2024  
**Next Review**: March 2024