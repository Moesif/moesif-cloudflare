//
const identifyUser = (req, res, env, ctx) => {
  const token = req.headers.get('Authorization') || res.headers.get('Authorization');
  if (token) {
    const jwtToken = token.split(' ')[1]; // Assuming the token is in the format "Bearer <token>"
    const decodedToken = atob(jwtToken.split('.')[1]);
    const tokenPayload = JSON.parse(decodedToken);
    return tokenPayload.sub; // Assuming the subject of the token is the user id
  }
  return undefined;
};

const identifyCompany = (req, res, env, ctx) => {
  return undefined;
};

const getSessionToken = (req, res, env, ctx) => {
  return undefined;
};

const getApiVersion = (req, res, env, ctx) => {
  return undefined;
};

const getMetadata = (req, res, env, ctx) => {
  return undefined;
};

const skip = (req, res, env, ctx) => {
  return false;
};

const maskContent = (moesifEvent) => {
  return moesifEvent;
};

function makeAppIdUrlRegexArr(urlPatterns) {
  const appIdUrlRegexArr = urlPatterns
    .filter((x) => x && (x.regex || x.applicationId)) // appId / urlRegEx both empty
    .map(({ regex, applicationId }) => {
      try {
        return {
          regex: new RegExp(regex),
          applicationId,
        };
      } catch (e) {
        console.error(e);
      }
    })
    .filter((x) => x && x.regex); // filter invalid regular expressions / blank entries
  return appIdUrlRegexArr;
}

function prepareOptions(options) {
  var INSTALL_OPTIONS;
  var INSTALL_ID;
  var INSTALL_PRODUCT;
  var INSTALL_TYPE = 'app';

  if (!options.applicationId) {
    throw new Error('no moesif application id found');
  }

  const DEFAULT_OPTIONS = {
    /*********************************
     * MOESIF_INSTALL
     * Set Your Moesif Application Id
     *********************************/
    applicationId: null, // required

    // log request and response bodies.
    // for bodies, the middleware splits stream by default to obtain an copy to read from
    // if you do not read the original request body, you may get a warning that a split was wasted.
    logBody: true,

    // true or false
    // This will mask any credit cards by checking for the Luhn algorithm
    hideCreditCards: true,

    // Set to true to prevent insertion of X-Moesif-Transaction-Id response header.
    // X-Moesif-Transaction-Id  is helpful for identifying transactions in Moesif.
    disableTransactionId: false,

    // Print debug messages to console.
    // Enable to share debug logs with Moesif support staff for quicker debug.
    debug: true,

    // Fetch timeout in milliseconds so that Moesif can log the call even if origin server doesnt respond
    fetchTimeoutMS: 120000,

    urlPatterns: [],

    identifyUser,
    identifyCompany,
    getApiVersion,
    getMetadata,
    getSessionToken,
    skip,
    maskContent,
  };

  return {
    INSTALL_TYPE,
    ...DEFAULT_OPTIONS,
    ...options,
    appIdUrlRegexArr: makeAppIdUrlRegexArr(options.urlPatterns || []),
  };
}

export default prepareOptions;
