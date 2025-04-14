/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import moesifMiddleware from 'moesif-cloudflare';
// import moesifMiddleware from '../../esm/src/index.mjs';

// Test data that will be compressed
const testData = {
  message: "This is a test message",
  data: {
    array: [1, 2, 3, 4, 5],
    nested: {
      field: "value"
    }
  }
};

async function originalFetchHandler(request, env, ctx) {
	const url = new URL(request.url);
	let apiUrl;

	// Route to different APIs based on the path
	switch (url.pathname) {
		case '/api/service1':
			apiUrl = 'https://httpbin.org/anything';
			break;
		case '/api/service2':
			apiUrl = 'https://httpbin.org/get';
			break;
    case '/api/local-test':
        apiUrl = 'http://localhost:3000/api/data';
        break;
    case '/api/brotli-test':
      // Create a response with pre-compressed Brotli data
      const response = new Response(testData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'br'
        }
      });
      return response;
		default:
			return new Response('Service not found', { status: 404 });
	}

	// Fetch the API and return the response
	const apiResponse = await fetch(apiUrl, {
		method: request.method,
		headers: request.headers,
		body: request.body,
	});

  return apiResponse;
}

const moesifOptions = {
	applicationId: 'eyJhcHAiOiI0ODc6MjA2IiwidmVyIjoiMi4xIiwib3JnIjoiODg6MjEwIiwiaWF0IjoxNzQzNDY1NjAwfQ.xxmkt4pNGojDw31soZzA01OJxKhkAe6gsN3jAH8A16U',
  identifyUser: (req, res) => {
    if (req.headers) {
      return req.headers.get('X-User-Id');
    }
  },
  identifyCompany: (req, res) => {
    if (req.headers) {
      return req.headers.get('X-Company-Id');
    }
  },
  debug: true // Enable debug logging to see the Brotli handling
};

const wrappedFetchHandler = moesifMiddleware(originalFetchHandler, moesifOptions);

export default {
	fetch: wrappedFetchHandler,
};
