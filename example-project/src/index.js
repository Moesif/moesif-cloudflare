/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import moesifMiddleware  from '../../esm/src/index.mjs';
// import moesifMiddleware from 'moesif-cloudflare';

async function originalFetch(request, env, ctx) {
  return new Response('Hello World!');
};

const moesifOptions = {
  applicationId: 'Your Moesif Application Id'
}

const fetch = moesifMiddleware(originalFetch, moesifOptions);

export default {
  fetch
};
