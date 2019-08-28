# Moesif Cloudflare App

[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

[Moesif Cloudflare app](https://www.cloudflare.com/apps/moesif) automatically tracks API requests and send to Moesif for API debugging and analytics.

[Source Code on GitHub](https://github.com/moesif/moesif-cloudflare)

Your Moesif Application Id can be found in the [_Moesif Portal_](https://www.moesif.com/).
After signing up for a Moesif account, your Moesif Application Id will be displayed during the onboarding steps. 

You can always find your Moesif Application Id at any time by logging 
into the [_Moesif Portal_](https://www.moesif.com/), click on the top right menu,
and then clicking _Installation_.

## Install via Cloudflare App

Go to the [Moesif app](https://www.cloudflare.com/apps/moesif) on Cloudflare's App Marketplace and click _Preview_

## Install via Cloudflare Dashboard

This option provides the most flexibility, allowing you to write custom logic to identify users, session tokens, etc per request.

- Visit the [Cloudfront Worker Dashboard](https://dash.cloudflare.com/workers). *(make sure you're looking at the Workers tab)*
- Click the `Launch editor` button
- Click the `Routes` tab and create a route under `Script enabled at:`. We suggest a pattern that matches all requests for your domain. Eg: If your domain is `foo.com`, **your pattern should be** `*foo.com/*`. This will match all requests to `foo.com` and any subdomains of `foo.com`.
- Click the `Script` tab, and replace the editor content with the latest version of the [Moesif Cloudflare worker](https://raw.githubusercontent.com/Moesif/moesif-cloudflare/master/MoesifWorker.js).
- replace any instances of the `INSTALL_OPTIONS` variable with desired values.
- update the `INSTALL_OPTIONS` declaration with the desired values.

For example:

```javascript
INSTALL_OPTIONS = {
  // your moesif App Id
  "appId": "",

  // only used by default identifyUser() implementation
  "userIdHeader": "",

  // only used by default identifyUser() implementation
  "companyIdHeader": "",

  // only used by default getSessionToken() implementation
  "sessionTokenHeader": "",

  // true or false
  "hideCreditCards": true
};
```

becomes

```javascript
INSTALL_OPTIONS = {
  // your moesif App Id
  "appId": "<< YOUR MOESIF APPLICATION ID >>",

  // only used by default identifyUser() implementation
  "userIdHeader": "User-Id",

  // only used by default identifyUser() implementation
  "companyIdHeader": "",

  // only used by default getSessionToken() implementation
  "sessionTokenHeader": "Authorization",

  // true or false
  "hideCreditCards": false
};
```

*Please note `HIDE_CREDIT_CARDS`, `sessionTokenHeader`, and `userIdHeader` may be `null`.*

- click `Update Preview` to see changes in the preview window, and click `Deploy` to deploy the worker to production

Congratulations! If everything was done corectly, Moesif should now be tracking all network requests that match the route you specified earlier. If you have any issues with set up, please reach out to support@moesif.com with the subject `Cloudflare Workers`.

## Other Installation Options

See [Deploying Workers](https://developers.cloudflare.com/workers/deploying-workers/) for more alternatives for setting up Cloudflare workers.


### Advanced Configuration

Moesif provides the most value when we can identify users. You may also want to specify metadata, mask certain data, or prevent tracking of certain requests entirely. This is possible with the hooks below.

To change the behavior of one of these hooks, replace the contents of that function in the Cloudflare Worker with the desired code.


#### __`overrideApplicationId`__

Type: `(MoesifEventModel) => String`
overrideApplicationId is a function that enables your worker to report events to different
moesif apps based on the event. You may want to do this if you have separate production and
staging environments.

```javascript
const overrideApplicationId = moesifEvent => {
  return moesifEvent.request.uri.startsWith('https://stg.foo.com')
    ? '<< MOESIF APP ID FOR STAGING APP >>'
    : '<< MOESIF APP ID FOR PROD APP >>';
};
```

#### __`identifyUser`__

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

#### __`getSessionToken`__

Type: `(Request, Response) => String`
getSessionToken a function that takes `req` and `res` arguments and returns a session token (i.e. such as an API key).


```javascript
const getSessionToken = (req, res) => {
  // your code here, must return a string.
  return req.headers.get('Authorization');
};
```

#### __`identifyCompany`__

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

#### __`getApiVersion`__

Type: `(Request, Response) => String`
getApiVersion is a function that takes a `req` and `res` arguments and returns a string to tag requests with a specific version of your API.


```javascript
const getApiVersion = (req, res) => {
  // your code here. must return a string.
  return '1.0.5'
};
```

#### __`getMetadata`__

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

#### __`skip`__

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

#### __`maskContent`__

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

For more documentation regarding on these fields,
see below or the [Moesif Node API Documentation](https://www.moesif.com/docs/api?javascript).

Fields | Required | Description
--------- | -------- | -----------
request.time | Required | Timestamp for the request in ISO 8601 format
request.uri | Required | Full uri such as https://api.com/?query=string including host, query string, etc
request.verb | Required | HTTP method used, i.e. `GET`, `POST`
request.api_version | Optional | API Version you want to tag this request with
request.ip_address | Optional | IP address of the end user
request.headers | Required | Headers of the  request
request.body | Optional | Body of the request in JSON format
||
response.time | Required | Timestamp for the response in ISO 8601 format
response.status | Required | HTTP status code such as 200 or 500
response.ip_address | Optional | IP address of the responding server
response.headers | Required | Headers of the response
response.body | Required | Body of the response in JSON format

## Examples


## Other integrations

To view more more documentation on integration options, please visit __[the Integration Options Documentation](https://www.moesif.com/docs/getting-started/integration-options/).__

[ico-license]: https://img.shields.io/badge/License-Apache%202.0-green.svg
[ico-source]: https://img.shields.io/github/last-commit/moesif/moesif-cloudflare.svg?style=social

[link-license]: https://raw.githubusercontent.com/Moesif/moesif-cloudflare/master/LICENSE
[link-source]: https://github.com/moesif/moesif-cloudflare
