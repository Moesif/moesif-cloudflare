// moesif-cloudflare
// https://github.com/Moesif/moesif-cloudflare
//
// For manual install, areas of interest are tagged with MOESIF_INSTALL

/**************************
* MOESIF_INSTALL
* Register logRequest handler.
* This line should be called before any other event listeners in your application
**************************/
addEventListener('fetch', event => {
  event.passThroughOnException();
  event.respondWith(logRequest(event));
});

/***********************
 * MOESIF_INSTALL
************************/

// this value is defined automatically by the Cloudflare App framework
var INSTALL_OPTIONS;
var INSTALL_ID;
var INSTALL_PRODUCT;
var INSTALL_TYPE = 'app';

// Not installed via Cloudflare App framework, so set your options manually
if (typeof INSTALL_OPTIONS === 'undefined') {
  INSTALL_OPTIONS = {
    /*********************************
     * MOESIF_INSTALL
     * Set Your Moesif Application Id
    *********************************/
    "applicationId": "",

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
  INSTALL_TYPE = 'custom';
}

let {
  applicationId,
  hideCreditCards,
  disableTransactionId,
  sessionTokenHeader,
  userIdHeader,
  companyIdHeader,
  urlPatterns = [],
  logIncomingRequests,
  logOutgoingRequests,
  debug
} = INSTALL_OPTIONS;

/****
 * sample urlPattern (optional)
urlPatterns = [
  {"applicationId" : "<Moesif AppId 1>", "regex": "^https://stating.my.domain/hello"},
  {"applicationId" : "<Moesif AppId 2>", "regex": "^https://experiment.my.domain/hello"},
  {"applicationId" : "",                 "regex": "^https://www.my.domain/hello"}
]
****/

/*********************
 * MOESIF_INSTALL
 * Configuration hooks
**********************/
const identifyUser = (req, res) => {
  return req.headers.get(userIdHeader) || res.headers.get(userIdHeader);
};

const identifyCompany = (req, res) => {
  return req.headers.get(companyIdHeader) || res.headers.get(companyIdHeader);
};

const getSessionToken = (req, res) => {
  return req.headers.get(sessionTokenHeader) || res.headers.get(sessionTokenHeader);
};

const getApiVersion = (req, res) => {
  return undefined;
};

const getMetadata = (req, res) => {
  return undefined;
};

const skip = (req, res) => {
  return false;
};

const maskContent = moesifEvent => {
  return moesifEvent;
};

const MAX_REQUESTS_PER_BATCH = 10;
const BATCH_DURATION = 1000; // ms
const TRANSACTION_ID_HEADER = 'X-Moesif-Transaction-Id';
let samplingPercentage = 100;

if (typeof INSTALL_ID === 'undefined') {
  INSTALL_ID = undefined;
}

if (typeof INSTALL_PRODUCT === 'undefined') {
  INSTALL_PRODUCT = undefined;
}

let appIdUrlRegexArr = urlPatterns
.filter(x => x && (x.regex || x.applicationId)) // appId / urlRegEx both empty
.map(({ regex, applicationId }) => {
  try {
    return {
      regex: new RegExp(regex),
      applicationId
    };
  } catch (e) {
    console.error(e);
  }
})
.filter(x => x && x.regex); // filter invalid regular expressions / blank entries

if (!applicationId && appIdUrlRegexArr.length === 0) {
  console.error('Cannot log API calls. No Moesif Application Id or valid URL Patterns specified.');
}

const overrideApplicationId = moesifEvent => {
  // you may want to use a different app ID based on the request being made
  const appIdUrlRegex = appIdUrlRegexArr.find(({ regex }) => regex.test(moesifEvent.request.uri));

  return appIdUrlRegex
    ? appIdUrlRegex.applicationId // may be an empty string, which means don't track this
    : applicationId;
};

const BATCH_URL = 'https://api.moesif.net/v1/events/batch';
const APP_CONFIG_URL = 'https://api.moesif.net/v1/config';
let appConfig = null;
let isAppConfigFetched = false;
let lastUpdatedAppConfigTime = null;
const fetchAppConfigTimeDeltaInMins = 300000;
let batchRunning = false;
let jobs = [];

function isMoesif(request) {
  return request.url.indexOf('moesif.net') !== -1;
}

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function moesifLog(message) {
  if (debug) console.log(`[MoesifWorker] ${message}`);
}

function runHook(fn, name, defaultValue) {
  let result = defaultValue;

  try {
    result = fn();
  } catch (e) {
    console.error(`Error running ${name} hook.`);
    console.error(e);
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
function doHideCreditCards(text) {
  if (hideCreditCards) {
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

function uuid4() {
  // https://gist.github.com/kaizhu256/4482069
  // return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  var uuid = '', ii;
  for (ii = 0; ii < 32; ii += 1) {
    switch (ii) {
    case 8:
    case 20:
      uuid += '-';
      uuid += (Math.random() * 16 | 0).toString(16);
      break;
    case 12:
      uuid += '-';
      uuid += '4';
      break;
    case 16:
      uuid += '-';
      uuid += (Math.random() * 4 | 8).toString(16);
      break;
    default:
      uuid += (Math.random() * 16 | 0).toString(16);
    }
  }
  return uuid;
}

async function makeMoesifEvent(request, response, before, after, txId, requestBody, userId, companyId) {
  moesifLog(`makeMoesifEvent start`)
  moesifLog(JSON.stringify({request: request, response: response}));

  const [
    responseBody
  ] = await Promise.all([
    // the worker later reads the response body
    // since reading the stream twice creates an error,
    // let's clone `response`
    response && response.clone ? response.clone().text() : Promise.resolve(undefined)
  ]);
  const moesifEvent = {
    userId: userId,

    companyId: companyId,

    sessionToken: runHook(
      () => getSessionToken(request, response),
      'getSessionToken',
      undefined
    ),

    metadata: runHook(
      () => getMetadata(request, response),
      'getMetadata',
      undefined
    ),

    request: {
      apiVersion: runHook(
        () => getApiVersion(request, response),
        'getApiVersion',
        undefined
      ),
      body: requestBody ? doHideCreditCards(requestBody) : undefined,
      time: before,
      uri: request.url,
      verb: request.method,
      headers: headersToObject(request.headers),
      ip_address: request.headers.get('cf-connecting-ip')
    },
    response: response.isEmpty ? undefined : {
      time: after,
      body: responseBody ? doHideCreditCards(responseBody) : undefined,
      status: response.status,
      headers: headersToObject(response.headers),
    },
    direction: response.isEmpty ? 'Incoming' : 'Outgoing',
    weight: samplingPercentage === 0 ? 1 : Math.floor(100 / samplingPercentage)
  };

  moesifEvent.request.headers[TRANSACTION_ID_HEADER] = txId;

  return runHook(
    () => maskContent(moesifEvent),
    'maskContent',
    moesifEvent
  );
}

function getSamplingPercentage(userId, companyId) {
  try {
    if (appConfig) {
      if ("user_sample_rate" in appConfig && userId in appConfig["user_sample_rate"]) {
        return appConfig["user_sample_rate"][userId];
      }
      else if ("company_sample_rate" in appConfig && companyId in appConfig["company_sample_rate"]) {
        return appConfig["company_sample_rate"][companyId];
      }
      else if ("sample_rate" in appConfig) {
        return appConfig["sample_rate"];
      }
    }
    return 100;
  } catch (error) {
    moesifLog(`Error while getting sampling percentage`)
    moesifLog(error)
    return 100;
  }
}

async function readAppConfigResponse(response) {
  const { headers } = response
  const contentType = headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  else {
    return null;
  }
}

async function fetchAppConfig() {
  moesifLog(`fetchAppConfig start`)

  const moesifHeaders = {
    'X-Moesif-Application-Id': applicationId
  }

  const options = {
    method: 'GET',
    headers: moesifHeaders
  };

  const response = await fetch(APP_CONFIG_URL, options)

  appConfig = await readAppConfigResponse(response)

  isAppConfigFetched = true;
}

async function handleBatch() {
  moesifLog(`handleBatch start`)

  if (!batchRunning) {
    batchRunning = true;

    await sleep(BATCH_DURATION);

    if (jobs.length) await batch();

    batchRunning = false;
  }
}

function batch() {
  moesifLog(`batch start`)

  if (jobs.length > 0) {
    const applicationIdMap = {};
    moesifLog(`batch has jobs`)

    jobs.forEach(({ appId, moesifEvent }) => {
      if (!(appId in applicationIdMap)) {
        applicationIdMap[appId] = [];
      }

      if ((moesifEvent.direction === 'Outgoing' && logOutgoingRequests) ||
          (moesifEvent.direction === 'Incoming' && logIncomingRequests)) {
        applicationIdMap[appId].push(moesifEvent);
      }
    });

    let promises = [];

    Object.keys(applicationIdMap).forEach(appId => {

      const moesifHeaders = {
        'Accept': 'application/json; charset=utf-8',
        'X-Moesif-Application-Id': appId,
        'User-Agent': 'moesif-cloudflare',
        'X-Moesif-Cf-Install-Id': INSTALL_ID,
        'X-Moesif-Cf-Install-Product': (INSTALL_PRODUCT && INSTALL_PRODUCT.id),
        'X-Moesif-Cf-Install-Type': INSTALL_TYPE,
      }
      moesifLog(JSON.stringify(moesifHeaders));

      const body = JSON.stringify(applicationIdMap[appId]);
      moesifLog(body);

      const options = {
        method: 'POST',
        headers: moesifHeaders,
        body: body
      };

      promises.push(fetch(BATCH_URL, options));
    });

    jobs = [];

    return Promise.all(promises);
  }
}

async function tryTrackRequest(event, request, response, before, after, txId, requestBody, userId, companyId) {
  if (!isMoesif(request) && !runHook(() => skip(request, response), 'skip', false)) {
    moesifLog(`tryTrackRequest start url=${request.url}`)

    const moesifEvent = await makeMoesifEvent(request, response, before, after, txId, requestBody, userId, companyId);
    const appId = runHook(() => overrideApplicationId(moesifEvent), 'overrideApplicationId', applicationId);
    event.waitUntil(moesifEvent);

    if (appId) {
      // only track this if there's an associated applicationId
      // services may want to not report certain requests

      jobs.push({
        appId,
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
}

let EmptyResponse = class Response {
  constructor() {
    this.isEmpty = true
    this.headers = new Headers();
    this.status = 599;
    this.statusText = undefined;
    this.url = undefined
  }
}

async function logRequest(event) {

  if (event.request._logged) {
    return;
  }

  var randomNumber = Math.random() * 100;
  // Fetch app Config first time or if not fetched within last 5 mins
  if (!isAppConfigFetched || lastUpdatedAppConfigTime == null || new Date().getTime() > lastUpdatedAppConfigTime + fetchAppConfigTimeDeltaInMins ) {
    lastUpdatedAppConfigTime = new Date().getTime();
    event.waitUntil(fetchAppConfig());
  }

  const request = event.request.clone();
  request._logged = true;
  event.request._logged = true;

  moesifLog(`logRequest start url=${request.url}`)

  const before = new Date();
  // use a cloned request so the read buffer isn't locked
  // when we inspect the request body later

  // Read request body
  const requestBody = await event.request.clone().text()

  const race = Promise.race([
    fetch(request),
    sleep(10000),
  ]);
  event.waitUntil(race);
  moesifLog(`logging request url=${request.url}`)

  const response = await race;
  if (response) {
    moesifLog(`response=${JSON.stringify(response)}`);
  } else {
    moesifLog('No response logged');
  }

  let userId = null;
  userId = runHook(
    () => identifyUser(request, response),
    'identifyUser',
    undefined
  );

  let companyId = null;
  companyId = runHook(
    () => identifyCompany(request, response),
    'identifyCompany',
    undefined
  );

  samplingPercentage = getSamplingPercentage(userId, companyId);
  if (randomNumber > samplingPercentage) {
    moesifLog('Skip sending event to Moesif due to sampling percentage');
    return response;
  } else {
    const after = new Date();
    const txId = request.headers.get(TRANSACTION_ID_HEADER) || uuid4();

    event.waitUntil(
      tryTrackRequest(
        event,
        request,
        (response ? response : new EmptyResponse()),
        before,
        after,
        txId,
        requestBody,
        userId,
        companyId
      )
    );

    if (!disableTransactionId && response && response.body) {
      const responseClone = new Response(response.body, response);
      responseClone.headers.set(TRANSACTION_ID_HEADER, txId);
      return responseClone;
    } else {
      return response;
    }
  }
}
