/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import moesifMiddleware from '../../esm/src/index.mjs';
// import moesifMiddleware from 'moesif-cloudflare';

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
	applicationId: 'Your Moesif Application Id',
  identifyUser: (req, res) => {
    if (req.headers) {
      return req.headers.get('X-User-Id');
    }
  },
  identifyCompany: (req, res) => {
    if (req.headers) {
      return req.headers.get('X-Company-Id');
    }
  }
};

const wrappedFetchHandler = moesifMiddleware(originalFetchHandler, moesifOptions);

export default {
	fetch: wrappedFetchHandler,
};
