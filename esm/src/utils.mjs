import brotliPromise from 'brotli-wasm';

function isMoesif(request) {
  return request.url.indexOf('moesif.net') !== -1;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function makeLogger(preface, options = {}) {
  return function moesifLog(message) {
    if (options.debug) console.log(`[${preface}] ${message}`);
  };
}

function headersToObject(headers) {
  const result = {};

  if (!headers) {
    return result;
  }

  for (let [key, val] of headers.entries()) {
    result[key] = val;
  }

  return result;
}

function luhnCheck(trimmed) {
  // https://github.com/JamesEggers1/node-luhn
  var length = trimmed.length;
  var odd = false;
  var total = 0;
  var calc;
  var calc2;

  if (length === 0) {
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
        case 10:
          calc2 = 1;
          break;
        case 12:
          calc2 = 3;
          break;
        case 14:
          calc2 = 5;
          break;
        case 16:
          calc2 = 7;
          break;
        case 18:
          calc2 = 9;
          break;
        default:
          calc2 = calc2;
      }
      total += calc2;
    }
    odd = !odd;
  }

  return total !== 0 && total % 10 === 0;
}

function uuid4() {
  // https://gist.github.com/kaizhu256/4482069
  // return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  var uuid = '',
    ii;
  for (ii = 0; ii < 32; ii += 1) {
    switch (ii) {
      case 8:
      case 20:
        uuid += '-';
        uuid += ((Math.random() * 16) | 0).toString(16);
        break;
      case 12:
        uuid += '-';
        uuid += '4';
        break;
      case 16:
        uuid += '-';
        uuid += ((Math.random() * 4) | 8).toString(16);
        break;
      default:
        uuid += ((Math.random() * 16) | 0).toString(16);
    }
  }
  return uuid;
}

/**
 * Hide anything that looks like a credit card
 * Perform a luhn check to reduce some false positives
 */
function doHideCreditCards(text, hideCreditCards) {
  if (hideCreditCards) {
    return text.replace(/[0-9]{14,19}/g, (match) => {
      return luhnCheck(match) ? '<<POTENTIAL CREDIT CARD REDACTED>>' : match;
    });
  } else {
    return text;
  }
}

function mightBeJson(str) {
  var newStr = str.trim();
  if (newStr.startsWith('{') || newStr.startsWith('[')) {
    return true;
  }
  return false;
}

function safeParseJson(str) {
  try {
    if (mightBeJson(str)) {
      return JSON.parse(str);
    }
    return str;
  } catch (err) {
    return str;
  }
}

async function decompressBrotli(text) {
  try {
    // Convert the text to a Uint8Array
    const encoder = new TextEncoder();
    const compressedData = encoder.encode(text);

    const brotli = await brotliPromise;

    // Decompress using brotli-wasm
    const decompressedData = await brotli.decompress(compressedData);

    // Convert back to text
    const decoder = new TextDecoder();
    return decoder.decode(decompressedData);
  } catch (err) {
    console.error('Error decompressing Brotli content:', err);
    return text;
  }
}

async function prepareBody(text, options={}, contentEncoding) {
  if (!text) {
    return text;
  }

  if (options.maxBodySize && text.length > options.maxBodySize) {
    return {
      "msg": "request body size exceeded options maxBodySize"
    };
  }

  // Handle Brotli encoded content
  if (contentEncoding === 'br') {
    text = await decompressBrotli(text);
  }

  const cleanedText = doHideCreditCards(text, options.hideCreditCards);

  return safeParseJson(cleanedText);
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


export { isMoesif, makeLogger, sleep, headersToObject, uuid4, luhnCheck, doHideCreditCards, runHook, prepareBody };
