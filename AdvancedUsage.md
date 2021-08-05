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

3. Additional options are below:

```javascript
INSTALL_OPTIONS = {
    // Your Moesif Application Id
    "applicationId": "Your Moesif Application Id",

    // Only used by CloudFlare App Worker Framework. Modify identifyUser() function instead. 
    "userIdHeader": "",

    // Only used by CloudFlare App Worker Framework. Modify identifyCompany() function instead.
    "companyIdHeader": "",

    // Only used by CloudFlare App Worker Framework. Modify getSessionToken() function instead.
    "sessionTokenHeader": "",

    // true or false
    "hideCreditCards": true,

    // set to true to prevent insertion of X-Moesif-Transaction-Id
    "disableTransactionId": false,

    // Log incoming API calls hitting your Cloudflare Worker
    "logIncomingRequests": true,

    // Log outgoing calls to your origin server from your Cloudflare Worker
    "logOutgoingRequests": true,

    // Print debug messages to console
    "debug": false

};
```

Besides the static fields in `INSTALL_OPTIONS`, you can also override the functions hooks like `identifyUser` and `skip`.
Just search for `Configuration hooks` in the `src/index.js` file. 

## Configuration options

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
