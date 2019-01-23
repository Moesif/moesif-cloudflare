// moesif-cloudflare
// https://github.com/Moesif/moesif-cloudflare
//
// Please update the `applicationId` as well as any hooks
// you'd like to use (eg: identifyUser, getSessionToken, etc)

const applicationId = INSTALL_OPTIONS.appId; // your moesif APP id
const HIDE_CREDIT_CARDS = INSTALL_OPTIONS.hideCreditCards; // true or false
const sessionTokenHeader = INSTALL_OPTIONS.sessionTokenHeader; // only used by default getSessionToken() implementation
const userIdHeader = INSTALL_OPTIONS.userIdHeader; // only used by default identifyUser() implementation

const overrideApplicationId = moesifEvent => {
  // you may want to use a different app ID based on the request being made
  // eg:
  // return moesifEvent.request.uri.startsWith('https://stg.foo.com')
  //   ? '<< MOESIF APP ID FOR STAGING APP >>'
  //   : '<< MOESIF APP ID FOR PROD APP >>';
  
  return applicationId;
};

const identifyUser = (req, res) => {
  return req.headers.get(userIdHeader) || res.headers.get(userIdHeader);
};

const getSessionToken = (req, res) => {
  return req.headers.get(sessionTokenHeader) || res.headers.get(sessionTokenHeader);
};

const getApiVersion = (req, res) => {
  return undefined;
}

const getMetadata = (req, res) => {
  return undefined;
}

const skip = (req, res) => {
  return false;
}

const maskContent = moesifEvent => {
  return moesifEvent;
};

//
// moesif worker code
//

const MAX_REQUESTS_PER_BATCH = 15;
const BATCH_DURATION = 5000; // ms

const BATCH_URL = 'https://api.moesif.net/v1/events/batch';
let batchRunning = false;

let jobs = [];

function isMoesif(request) {
  return request.url.indexOf('https://api.moesif.net') !== -1;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function runHook(fn, name, defaultValue) {
  let result = defaultValue;

  try {
    result = fn();
  } catch (e) {
    console.log(`Error running ${name} hook.`);
    console.log(e);
  }

  if (result === undefined || result === null) {
    result = defaultValue;
  }

  return result;
}

function headersToObject(headers) {
  const result = {};

  for (let [key, val] of headers.entries()) {
    result[key] = val;
  }

  return result;
}

/**
 * Hide anything that looks like a credit card
 * Perform a luhn check to reduce some false positives
 */
function hideCreditCards(text) {
  if (HIDE_CREDIT_CARDS) {
    return text.replace(/[0-9]{14,19}/g, (match) => {
      return luhnCheck(match)
        ? '<<POTENTIAL CREDIT CARD REDACTED>>'
        : match;
    });
  } else {
    return text;
  }
}

function luhnCheck(trimmed) {
  // https://github.com/JamesEggers1/node-luhn
  var length = trimmed.length;
  var odd = false;
  var total = 0;
  var calc;
  var calc2;

  if (length === 0){
    return true;
  }

  if (!/^[0-9]+$/.test(trimmed)) {
    return false;
  }

  for (var i = length; i > 0; i--) {
    calc = parseInt(trimmed.charAt(i - 1));
    if (!odd) {
      total += calc;
    } else {
      calc2 = calc * 2;

      switch (calc2) {
        case 10: calc2 = 1; break;
        case 12: calc2 = 3; break;
        case 14: calc2 = 5; break;
        case 16: calc2 = 7; break;
        case 18: calc2 = 9; break;
        default: calc2 = calc2;
      }
      total += calc2;
    }
    odd = !odd;
  }

  return (total !== 0 && (total % 10) === 0);
}

async function makeMoesifEvent(request, response, before, after) {
  const [
    requestBody,
    responseBody
  ] = await Promise.all([
    request.clone().text(),
    // the worker later reads the response body
    // since reading the stream twice creates an error,
    // let's clone `response`
    response.clone().text()
  ]);

  const moesifEvent = {
    userId: runHook(
      () => identifyUser(request, response),
      identifyUser.name,
      undefined
    ),

    sessionToken: runHook(
      () => getSessionToken(request, response),
      getSessionToken.name,
      undefined
    ),

    metadata: runHook(
      () => getMetadata(request, response),
      getMetadata.name,
      undefined
    ),

    request: {
      apiVersion: runHook(
        () => getApiVersion(request, response),
        getApiVersion.name,
        undefined
      ),
      body: hideCreditCards(requestBody),
      time: before,
      uri: request.url,
      verb: request.method,
      headers: headersToObject(request.headers),
      ip_address: request.headers.get('cf-connecting-ip')
    },
    response: {
      time: after,
      body: hideCreditCards(responseBody),
      status: response.status,
      headers: headersToObject(response.headers)
      // ip_address is not permitted through cloudfront at this time
      // https://community.cloudflare.com/t/allow-direct-ip-access-from-workers-and-all-headers-with-fetch/48240/2
    }
  };

  return runHook(
    () => maskContent(moesifEvent),
    maskContent.name,
    moesifEvent
  );
}

async function handleBatch() {
  if (!batchRunning) {
    batchRunning = true;

    await sleep(BATCH_DURATION);

    if (jobs.length) await batch();

    batchRunning = false;
  }
}

function batch() {
  if (jobs.length > 0) {
    const appIdMap = {};

    jobs.forEach(({ applicationId, moesifEvent }) => {
      if (!(applicationId in appIdMap)) {
        appIdMap[applicationId] = [];
      }

      appIdMap[applicationId].push(moesifEvent);
    });

    let promises = [];

    Object.keys(appIdMap).forEach(applicationId => {
      const options = {
        method: 'POST',
        headers: {
          Accept: 'application/json; charset=utf-8',
          'X-Moesif-Application-Id': applicationId,
          'User-Agent': 'moesif-cloudfront'
        },
        body: JSON.stringify(appIdMap[applicationId])
      };

      promises.push(fetch(BATCH_URL, options));
    });
    
    jobs = [];

    return Promise.all(promises);
  }
}

async function tryTrackRequest(event, request, response, before, after) {
  if (!isMoesif(request) && !runHook(() => skip(request, response), skip.name, false)) {
    const moesifEvent = await makeMoesifEvent(request, response, before, after);

    jobs.push({
      applicationId: runHook(() => overrideApplicationId(moesifEvent), overrideApplicationId.name, applicationId),
      moesifEvent
    });

    if (jobs.length >= MAX_REQUESTS_PER_BATCH) {
      // let's send everything right now
      event.waitUntil(batch());
    } else if (!batchRunning) {
      // wait until the next batch job
      // event.waitUntil(sleep(BATCH_DURATION));
      event.waitUntil(handleBatch());
    } else {
      // a batch job is already running and keeping this worker awake
      // we don't need to wait
    }
  }
}

async function handleRequest(event) {
  const request = event.request;
  const before = new Date();
  // use a cloned request so the read buffer isn't locked
  // when we inspect the request body later
  const response = await fetch(request.clone());
  const after = new Date();

  event.waitUntil(tryTrackRequest(event, request, response, before, after));

  return response;
}

addEventListener('fetch', event => {
  // if this worker breaks, don't break the site
  // https://developers.cloudflare.com/workers/writing-workers/handling-errors/
  event.passThroughOnException();

  event.respondWith(handleRequest(event));
});