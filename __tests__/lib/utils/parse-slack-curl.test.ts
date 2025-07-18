/**
 * Unit Tests - What are they?
 * 
 * Unit tests are automated checks that verify your code works correctly.
 * Think of them as a safety net that catches bugs before users do!
 * 
 * Each test:
 * 1. Sets up a scenario (arrange)
 * 2. Runs your code (act)
 * 3. Checks the result (assert)
 * 
 * Benefits:
 * - Catches bugs early
 * - Makes refactoring safer
 * - Documents how your code should work
 * - Gives confidence when making changes
 */

import { parseSlackCurl } from '@/lib/utils/parse-slack-curl'

describe('parseSlackCurl', () => {
  // A "describe" block groups related tests together
  
  it('should parse a valid Slack curl command', () => {
    // "it" defines a single test case
    
    // Arrange: Set up test data
    const validCurl = `curl 'https://myworkspace.slack.com/api/emoji.adminList?token=xoxc-123456' \
      -H 'Cookie: d=xoxd-abcdef'`
    
    // Act: Run the function we're testing
    const result = parseSlackCurl(validCurl)
    
    // Assert: Check the results
    expect(result.isValid).toBe(true)
    expect(result.workspace).toBe('myworkspace')
    expect(result.token).toBe('xoxc-123456')
    expect(result.cookie).toContain('d=xoxd-abcdef')
  })

  it('should handle invalid curl commands', () => {
    // Test edge cases and error scenarios
    const invalidCurl = 'not a curl command'
    
    const result = parseSlackCurl(invalidCurl)
    
    expect(result.isValid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should extract token from form data', () => {
    const curlWithFormData = `curl 'https://workspace.slack.com/api/emoji.add' \
      --form 'token=xoxc-789' \
      --form 'name=test'`
    
    const result = parseSlackCurl(curlWithFormData)
    
    expect(result.token).toBe('xoxc-789')
  })

  it('should handle curl commands without cookies', () => {
    const curlNoCookie = `curl 'https://workspace.slack.com/api/emoji.list?token=xoxc-123'`
    
    const result = parseSlackCurl(curlNoCookie)
    
    expect(result.isValid).toBe(true)
    expect(result.cookie).toBe('')
  })
})