# Moesif Cloudflare App

[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

Cloudflare app to automatically track API requests and send to Moesif for API debugging and analytics.

[Source Code on GitHub](https://github.com/moesif/moesif-cloudflare)


## How to install


## How to use


## Configuration options


#### __`identifyUser`__

Type: `(Request, Response) => String`
identifyUser is a function that takes `req` and `res` as arguments
and returns a userId. This helps us attribute requests to unique users. Even though Moesif can
automatically retrieve the userId without this, this is highly recommended to ensure accurate attribution.


```
options.identifyUser = function (req, res) {
  // your code here, must return a string
  return req.user.id
}
```

#### __`getSessionToken`__

Type: `(Request, Response) => String`
getSessionToken a function that takes `req` and `res` arguments and returns a session token (i.e. such as an API key).


```javascript
options.getSessionToken = function (req, res) {
  // your code here, must return a string.
  return req.headers['Authorization'];
}
```

#### __`getApiVersion`__

Type: `(Request, Response) => String`
getApiVersion is a function that takes a `req` and `res` arguments and returns a string to tag requests with a specific version of your API.


```javascript
options.getApiVersion = function (req, res) {
  // your code here. must return a string.
  return '1.0.5'
}
```

#### __`getMetadata`__

Type: `(Request, Response) => Object`
getMetadata is a function that takes a `req` and `res` and returns an object that allows you
to add custom metadata that will be associated with the req. The metadata must be a simple javascript object that can be converted to JSON. For example, you may want to save a VM instance_id, a trace_id, or a tenant_id with the request.


```javascript
options.getMetadata = function (req, res) {
  // your code here:
  return {
    foo: 'custom data',
    bar: 'another custom data'
  };
}
```

#### __`skip`__

Type: `(Request, Response) => Boolean`
skip is a function that takes a `req` and `res` arguments and returns true if the event should be skipped (i.e. not logged)
<br/>_The default is shown below and skips requests to the root path "/"._


```javascript
options.skip = function (req, res) {
  // your code here. must return a boolean.
  if (req.path === '/') {
    // Skip probes to home page.
    return true;
  }
  return false
}
```

#### __`maskContent`__

Type: `MoesifEventModel => MoesifEventModel`
maskContent is a function that takes the final Moesif event model (rather than the req/res objects) as an argument before being sent to Moesif.
With maskContent, you can make modifications to the headers or body such as removing certain header or body fields.


```javascript
options.maskContent = function(event) {
  // remove any field that you don't want to be sent to Moesif.
  return event;
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
