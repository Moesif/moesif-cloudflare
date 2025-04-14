const assert = require('assert');

async function testBrotliHandling() {
  console.log('Testing Brotli handling...');

  // Make a request to the brotli-test endpoint
  const response = await fetch('http://localhost:8787/api/brotli-test');

  // Verify the response has Brotli encoding
  const contentEncoding = response.headers.get('Content-Encoding');
  console.log('Content-Encoding:', contentEncoding);
  assert.strictEqual(contentEncoding, 'br', 'Response should have Brotli encoding');

  // Get the response body
  const body = await response.text();
  console.log('Response body:', body);

  // Parse the response body
  const parsedBody = JSON.parse(body);
  console.log('Parsed body:', parsedBody);

  // Verify the content matches our test data
  assert.deepStrictEqual(parsedBody, {
    message: "This is a test message",
    data: {
      array: [1, 2, 3, 4, 5],
      nested: {
        field: "value"
      }
    }
  }, 'Response body should match test data');

  console.log('Brotli test passed successfully!');
}

// Run the test
testBrotliHandling().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
