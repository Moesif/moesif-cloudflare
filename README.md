# Moesif Cloudflare SDK

This SDK is for integration [Moesif](https://www.moesif.com) with [Cloudflare Workers](https://developers.cloudflare.com/workers/) using the new ES Module Model.

## Important Note about Legacy Service Worker Model

If you are using Cloudflare's [Service Workers API instead of the new EsModule](https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/),
please follow the [legacy instruction here](/legacy/README.md)

## Installation

in your wrangler created project.

```bash
npm install moesif-cloudflare
```

In your code
```javascript
import moesifMiddleware from 'moesif-cloudflare';

const options = {
  applicationId: 'YOUR MOESIF Application ID',
};

// your original fetch handler.
async function originalFetch(request, _env, context) {
  // your code.
}

// this create a new fetch that is wrapped by moesifMiddleware
const fetch = moesifMiddleware(originalFetch, options);

// export the fetch handler.
export default {
  fetch
};

```

## Options

See full list of options for moesifMiddleware in [prepareOptions.mjs](/esm/src/prepareOptions.mjs), see `DEFAULT_OPTIONS`;


### Example

The [example-project folder](/example-project/) contains an example generated
via `npm create cloudflare@latest` as in the [Cloudflare get started guide](https://developers.cloudflare.com/workers/get-started/guide/)

