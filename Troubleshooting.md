## Troubleshooting

General tip: If a worker was deployed using the `Wrangler` CLI, see [WRANGLER.md](WRANGLER.md) for howto `tail` production logs.

### Timeout errors
Your worker code should register a function that calls `event.respondWith` to ensure a response is returned. 
Moesif will not return the response directly. 

```javascript
// Add Moesif handler from top of `src/index.js` file
addEventListener('fetch', event => {
  logRequest(event);
});

// Sample hello world app
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  return new Response('hello world', {status: 200})
}

// Rest of `src/index.js` file
```

### Requests not being logged
If you installed via the custom install with Cloudflare Workers, then you need to set the route pattern to ensure the worker is active for the correct routes. Cloudflare has [very specific rules](https://developers.cloudflare.com/workers/about/routes/) for the route pattens. 

The most common mistake is that a route pattern `*.acmeinc.com/*` matches only subdomains of acmeinc.com, but will not match `https://acmeinc.com`. 
The correct route would be `https://acmeinc/*` or `*acmeinc/*`._

_The Cloudflare Editor UI does not look at the route pattern, so it may look like your worker is configured correctly until you access your API via code._

### Responses not being logged
If you override the response in your worker code via `event.respondWith`, Moesif is unable to log the response due to the inherent design of Cloudflare workers. 
We recommend a [different integration](https://www.moesif.com/docs/server-integration/) if you require this.

### There are duplicate requests logged
The integration logs both the incoming requests into your CloudFlare worker and also the outgoing requests to your origin server. 
You can filter on type of API traffic within Moesif UI via the `direction` flag. 
To disable logging incoming or outgoing API calls, set the option `logIncomingRequests` or `logOutgoingRequests` to false. 

#### Route patterns must include your zone

If your zone is example.com, then the simplest possible route pattern you can have is example.com, which would match `http://example.com/` and `https://example.com/`, and nothing else. As with a URL, there is an implied path of `/` if you do not specify one.

#### Route patterns may not contain any query parameters

For example, `https://example.com/?anything` is not a valid route pattern.

#### Route patterns may optionally begin with `http://` or `https://`

If you omit a scheme in your route pattern, it will match both `http://` and `https://` URLs. If you include `http://` or `https://`, it will only match HTTP or HTTPS requests, respectively.

    `https`://*.example.com/` matches `https://www.example.com/` but not `http://www.example.com/`

    `*.example.com/` matches both `https`://www.example.com/` and `http://www.example.com/`.

#### Hostnames may optionally begin with `*`

If a route pattern hostname begins with `*`, then it matches the host and all subhosts. If a route pattern hostname begins with `*.`, then it matches only all subhosts.

    `*example.com/` matches `https://example.com/` and `https://www.example.com/`

    `*.example.com/` matches `https://www.example.com/` but not `https://example.com/`

#### Paths may optionally end with `*`

If a route pattern path ends with `*`, then it matches all suffixes of that path.

    `https://example.com/path*` matches `https://example.com/path` and `https://example.com/path2` and `https://example.com/path/readme.txt`

    `https://example.com/path/*` matches `https://example.com/path/readme.txt` but not `https://example.com/path2`.

#### Response status and body not captured when using Workers in Playground
When using the Cloudflare Workers in the Playground, you woud see Moesif will log an event with no response status and no response body. This is expected when using Playground because due to the inherent design of Cloudflare workers you've to use `respondWith()` to intercepts the event, promising to return the result of the handleRequest function to the client. So, it'll be unable to act as an origin server which prevents Moesif to capture api call made from the Cloudflare to the origin server. Please note: This will only happen when working in Playground, incase of origin server defined, Moesif will capture api call from client to Cloudflare worker and Cloudflare worker to the origin server.

For more documentation regarding on these fields,
see below or the [Moesif API Reference](https://www.moesif.com/docs/api?javascript#create-an-event).

Name | Required | Description
--------- | -------- | -----------
request | __true__ | The object that specifies the request message
request.time| __true__ | Timestamp for the request in ISO 8601 format
request.uri| __true__ | Full uri such as _https://api.com/?query=string_ including host, query string, etc
request.verb| __true__ | HTTP method used, i.e. `GET`, `POST`
request.api_version| false | API Version you want to tag this request with such as _1.0.0_
request.ip_address| false | IP address of the requester, If not set, we use the IP address of your logging API calls.
request.headers| __true__ | Headers of the  request as a `Map<string, string>`. Multiple headers with the same key name should be combined together such that the values are joined by a comma. [HTTP Header Protocol on w3.org](https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2)
request.body| false | Body of the request in JSON format
||
response | false | The object that specifies the response message, not set implies no response received such as a timeout.
response.time| __true__ | Timestamp for the response in ISO 8601 format
response.status| __true__ | HTTP status code as number such as _200_ or _500_
response.ip_address| false | IP address of the responding server
response.headers| __true__ | Headers of the response as a `Map<string, string>`. Multiple headers with the same key name should be combined together such that the values are joined by a comma. [HTTP Header Protocol on w3.org](https://www.w3.org/Protocols/rfc2616/rfc2616-sec4.html#sec4.2)
response.body| false | Body of the response in JSON format
||
session_token | _Recommend_ | The end user session token such as a JWT or API key, which may or may not be temporary. Moesif will auto-detect the session token automatically if not set.
user_id | _Recommend_ | Identifies this API call to a permanent user_id
metadata | false | A JSON Object consisting of any custom metadata to be stored with this event.

## Other integrations

See [Deploying Workers](https://developers.cloudflare.com/workers/deploying-workers/) for other alternatives for setting up Cloudflare workers.
