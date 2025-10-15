# Moesif Cloudflare App

> Important!!
> This is for Cloudflare Legacy App Marketplace and legacy based Service Worker API.
> If you are using the [new EsModule Approach](https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/) please see main readme of this repo.

[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

[Moesif Cloudflare app](https://www.cloudflare.com/apps/moesif) to automatically log API traffic to [Moesif](https://www.moesif.com) for API analytics and monetization platform.
[Source Code on GitHub](https://github.com/moesif/moesif-cloudflare)


You can install Moesif using the Cloudflare Marketplace (simple install) or you can add the `src/index.js`  script directly (custom install).
The custom install provides the most flexibility, allowing you to write custom logic to identify users, session tokens, etc.

Your `Moesif Application Id` can be found in the [_Moesif Portal_](https://www.moesif.com/).
After signing up for a Moesif account, your Moesif Application Id will be displayed during the onboarding steps.

## Install via Cloudflare App (Simple install)

> Cloudflare deprecated their app marketplace. 

* Go to the [Moesif app on Cloudflare](https://www.cloudflare.com/apps/moesif) and click _Preview_
* Update `Your Moesif Application Id` here.
* Click _Finish Installing onto your site_ button.

## Install via Cloudflare Workers (Custom install) using Cloudflare Dashboard

The Cloudflare Playground lacks an origin server so `logOutgoingRequests` has no effect. As a workaround for testing, you can temporarily set `logIncomingRequests` to true.
Mo API response will be logged, but you can at least verify basic functionality. Once you release to production (where an origin server exists), ensure you revert `logIncomingRequests` back to false to avoid duplicate events being logged.
{: .text-center .notice--warning}

### 1. Create new Worker using Moesif Javascript code

1. Go to [Cloudflare Workers Dashboard](https://dash.cloudflare.com/workers).
2. Select `Manage Workers` > `Create a Worker`
3. In the `Script` window, replace the pre-populated code with the contents of the Moesif worker [src/index.js](https://github.com/Moesif/moesif-cloudflare/blob/master/src/index.js) to your worker.
4. Required - Add the Moesif Application Id: Either `a` or `b` or both
* a. [Recommended ] Update `"INSTALL_OPTIONS.applicationId": "",` to use single `Moesif Application Id` for entire site
* b. [Optional - advanced use] Update `INSTALL_OPTIONS.urlPatterns`, for finer grained control over using multiple Moesif Application Ids and customized routes
5. Name of new worker: Cloudflare auto-generates a random name for new worker such as `gentle-unit-7e11`. You may choose to rename it to something friendly like `moesif-api-analytics-logger`

### 2. Set the Route for the newly created Worker
6. Go back to [Cloudflare Workers Dashboard](https://dash.cloudflare.com/workers) and select `Add Route`.
* `Route` : Set a valid route. We recommend matching all requests for your domain. For example if your domain is `acmeinc.com`, your pattern should be `*acmeinc.com/*`.
* `Worker`: Select the worker created above.
* Save.

### 3. Try it!
Just visit your link on cloudflare using your web browser `https://my-cloudflare-domain/my-path` or
```bash
curl https://my-cloudflare-domain/my-path
```
The API calls should show up in Moesif event stream. For testing in the Cloudflare Playground, the response may be empty due to lack of origin server.

### 4. Disable `logIncomingRequests` for production

Once you release to production (where an origin server exists), ensure you set `logIncomingRequests` back to false. Otherwise, you might have duplicate events where one has no response.

## [Alternative] Install via Cloudflare Workers (Custom install) using `wrangler` CLI
Using `Cloudflare/Wrangler` CLI allows for automated install using `wrangler publish`, as well as view/`tail` using `wrangler tail` command
* Visit [WRANGLER.md](https://github.com/Moesif/moesif-cloudflare/blob/master/WRANGLER.md) for details.


## Advanced Usage

### Optional: Advanced usage

1. Custom routes and using multiple Moesif Application Ids

Here is a sample `INSTALL_OPTIONS.urlPatterns`:
```javascript
urlPatterns = [
  {"applicationId" : "<Moesif AppId 1>", "regex": "^https://stating.my.domain/hello"},
  {"applicationId" : "<Moesif AppId 2>", "regex": "^https://experiment.my.domain/hello"},
  {"applicationId" : "",                 "regex": "^https://www.my.domain/hello"}
]
```
A blank `applicationId` in `urlPatterns` will result in use of default `INSTALL_OPTIONS.applicationId`

2. Customizing `addEventListener` to work with other unrelated 3rd party `Cloudflare Apps` or other advanced worker scenarios
Advanced scenarios are not discussed here. However, when working with other apps or workers, you may need to replace `event.respondWith(logRequest(event));` with `event.waitUntil(logRequest(event));`

1. Configure install options

Install options can be found in two places:

1. Static options are present in the `INSTALL_OPTIONS` dictionary at top of file
2. Configuration hooks (to implement logic for functions like `identifyUser`) can be found right after the `INSTALL_OPTIONS`  dictionary. Just search for `Configuration hooks` in the `src/index.js` file.

### Configuration options

Moesif provides the most value when we can identify users. You may also want to specify metadata, mask certain data, or prevent tracking of certain requests entirely. This is possible with the hooks below.

To change the behavior of one of these hooks, replace the contents of that function in the Cloudflare Worker with the desired code.

### __`overrideApplicationId`__

Type: `(MoesifEventModel) => String`
overrideApplicationId is a function that enables your worker to report events to different
moesif apps based on the event. You may want to do this if you have separate production and
staging environments.

```javascript
const overrideApplicationId = moesifEvent => {
  return moesifEvent.request.uri.startsWith('https://staging.acmeinc.com')
    ? 'Your Moesif Application Id for Staging'
    : 'Your Moesif Application Id for Production'
};
```

### __`identifyUser`__

Type: `(Request, Response) => String`
identifyUser is a function that takes `req` and `res` as arguments
and returns a userId. This helps us attribute requests to unique users. Even though Moesif can
automatically retrieve the userId without this, this is highly recommended to ensure accurate attribution.


```javascript
const identifyUser = (req, res) => {
  // your code here, must return a string
  return req.user.id;
};
```

### __`getSessionToken`__

Type: `(Request, Response) => String`
getSessionToken a function that takes `req` and `res` arguments and returns a session token (i.e. such as an API key).


```javascript
const getSessionToken = (req, res) => {
  // your code here, must return a string.
  return req.headers.get('Authorization');
};
```

### __`identifyCompany`__

Type: `(Request, Response) => String`
identifyCompany is a function that takes `req` and `res` as arguments
and returns a companyId. This helps us attribute requests to unique companies. Even though Moesif can
automatically retrieve the companyId without this, this is highly recommended to ensure accurate attribution.


```javascript
const identifyCompany = (req, res) => {
  // your code here, must return a string
  return req.company.id;
};
```

### __`getApiVersion`__

Type: `(Request, Response) => String`
getApiVersion is a function that takes a `req` and `res` arguments and returns a string to tag requests with a specific version of your API.


```javascript
const getApiVersion = (req, res) => {
  // your code here. must return a string.
  return '1.0.5'
};
```

### __`getMetadata`__

Type: `(Request, Response) => Object`
getMetadata is a function that takes a `req` and `res` and returns an object that allows you
to add custom metadata that will be associated with the req. The metadata must be a simple javascript object that can be converted to JSON. For example, you may want to save a VM instance_id, a trace_id, or a tenant_id with the request.


```javascript
const getMetadata = (req, res) => {
  // your code here:
  return {
    foo: 'custom data',
    bar: 'another custom data'
  };
};
```

### __`skip`__

Type: `(Request, Response) => Boolean`
skip is a function that takes a `req` and `res` arguments and returns true if the event should be skipped (i.e. not logged)
<br/>_The default is shown below and skips requests to the root path "/"._


```javascript
const skip = (req, res) => {
  // your code here. must return a boolean.
  if (req.path === '/') {
    // Skip probes to home page.
    return true;
  }
  return false
};
```

### __`maskContent`__

Type: `MoesifEventModel => MoesifEventModel`
maskContent is a function that takes the final Moesif event model (rather than the req/res objects) as an argument before being sent to Moesif.
With maskContent, you can make modifications to the headers or body such as removing certain header or body fields.


```javascript
const maskContent = moesifEvent => {
  // remove any field that you don't want to be sent to Moesif.
  return moesifEvent;
}
 ```

`EventModel` format:

```json
{
  "request": {
    "time": "2016-09-09T04:45:42.914",
    "uri": "https://api.acmeinc.com/items/83738/reviews/",
    "verb": "POST",
    "api_version": "1.1.0",
    "ip_address": "61.48.220.123",
    "headers": {
      "Host": "api.acmeinc.com",
      "Accept": "*/*",
      "Connection": "Keep-Alive",
      "Content-Type": "application/json",
      "Content-Length": "126",
      "Accept-Encoding": "gzip"
    },
    "body": {
      "items": [
        {
          "direction_type": 1,
          "item_id": "fwdsfrf",
          "liked": false
        },
        {
          "direction_type": 2,
          "item_id": "d43d3f",
          "liked": true
        }
      ]
    }
  },
  "response": {
    "time": "2016-09-09T04:45:42.914",
    "status": 500,
    "headers": {
      "Vary": "Accept-Encoding",
      "Pragma": "no-cache",
      "Expires": "-1",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache"
    },
    "body": {
      "Error": "InvalidArgumentException",
      "Message": "Missing field location"
    }
  },
  "user_id": "mndug437f43",
  "session_token":"end_user_session_token"
}

```


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

_The Cloudflare Playground does not look at the route pattern, so it may look like your worker is configured correctly until you access your API via code._

Another mistake is not enabling `logIncomingRequests` when testing Moesif in the Cloudflare Playground. The Playground lacks an origin server so `logOutgoingRequests`  won't work.
For testing, you can temporarily set `logIncomingRequests` to true to capture requests earlier in the request lifecycle (Note: responses will be empty).

For production, make sure you disable `logIncomingRequests` once a real origin server exists to ensure duplicate calls are not logged.

### There are duplicate requests logged
The integration logs both the incoming requests into your CloudFlare worker and also the outgoing requests to your origin server.
For production apps with a proxy route set up, you should have `logIncomingRequests` set to false. Typically `logIncomingRequests` is enabled for testing in the cloudflare sandbox where
no origin server exists.

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
When using the Cloudflare Workers in the Playground, you would see Moesif will log an event with no response status and no response body. This is expected when using Playground because due to the inherent design of Cloudflare workers you've to use `respondWith()` to intercepts the event, promising to return the result of the handleRequest function to the client. So, it'll be unable to act as an origin server which prevents Moesif to capture api call made from the Cloudflare to the origin server. Please note: This will only happen when working in Playground, incase of origin server defined, Moesif will capture api call from client to Cloudflare worker and Cloudflare worker to the origin server.

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

#### Support
If you have any issues with set up, please reach out to support@moesif.com with the subject `Cloudflare Workers`.

To view more documentation on integration options, please visit __[the Integration Options Documentation](https://www.moesif.com/docs/getting-started/integration-options/).__

[ico-license]: https://img.shields.io/badge/License-Apache%202.0-green.svg
[ico-source]: https://img.shields.io/github/last-commit/moesif/moesif-cloudflare.svg?style=social

[link-license]: https://raw.githubusercontent.com/Moesif/moesif-cloudflare/master/LICENSE
[link-source]: https://github.com/moesif/moesif-cloudflare
