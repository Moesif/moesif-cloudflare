import { makeLogger, sleep } from './utils.mjs';

const BATCH_URL = 'https://api.moesif.net/v1/events/batch';
const EVENT_QUEUE_SIZE = 500000;    // 500K
const MAX_REQUESTS_PER_BATCH = 100;
const BATCH_DURATION = 5000; // ms
let MAX_BATCH_WAIT_TIME_MS = 1000; // MS


var INSTALL_ID;
var INSTALL_PRODUCT;

if (typeof INSTALL_ID === 'undefined') {
  INSTALL_ID = undefined;
}

if (typeof INSTALL_PRODUCT === 'undefined') {
  INSTALL_PRODUCT = undefined;
}
class Batcher {
  constructor(state, options) {
    this.moesifLog = makeLogger('MoesifBatcher', options);
    this.batchRunning = false;
    this.jobs = [];
    this.lastBatchSentDate = new Date(new Date() - MAX_BATCH_WAIT_TIME_MS);
  }

  hasLastBatchSentTimeExpired() {
    return new Date() - this.lastBatchSentDate > MAX_BATCH_WAIT_TIME_MS;
  }

  async handleBatch() {
    this.moesifLog(`handleBatch start`);
    if (!this.batchRunning) {
      await sleep(BATCH_DURATION);
      if (this.jobs.length) {
        const jobsForBatching = structuredClone(this.jobs); // clone it
        this.jobs = []; // empty the jobs as it's been cloned
        return await this.batch(jobsForBatching);
      }
    }
  }

  async enqueueData(appId, moesifEvent) {
    if (appId) {
      // only track this if there's an associated applicationId
      // services may want to not report certain requests

      if (this.jobs.length >= EVENT_QUEUE_SIZE) {
        this.moesifLog(`Queue is full, skipping new events`);
      } else {
        this.jobs.push({
          appId,
          moesifEvent,
        });
      }

      // Log the events to moesif if batch is available or max batch time has expired.
      if (
        this.jobs.length &&
        (this.jobs.length >= MAX_REQUESTS_PER_BATCH || this.hasLastBatchSentTimeExpired())
      ) {
        // wait until the next batch job
        // event.waitUntil(sleep(BATCH_DURATION));
        return this.handleBatch();
      } else {
        // a batch job is already running and keeping this worker awake
        // we don't need to wait
      }
    }
  }

  batch(jobsForBatching) {
    // ------------------------
    //      Important
    // This should be the first statement in the function.
    // ------------------------
    this.batchRunning = true;

    this.moesifLog(`batch start job size ${jobsForBatching.length}`);

    const applicationIdMap = {};
    // e.g;
    // jobs = [
    //   { "appId": "aid-1" , "moesifEvent": {"direction": "Outgoing" ,  "request" : [1, 2, 3] }    },
    //   { "appId": "aid-2" , "moesifEvent": {"direction": "Incoming"  , "response": [21, 22, 23] } },
    //   { "appId": "aid-3" , "moesifEvent": {"direction": "Outgoing"  , "request" : [31, 32, 33] } }
    // ];
    this.moesifLog(`batch has jobs`);

    // Group events by appId
    jobsForBatching.forEach(({ appId, moesifEvent }) => {
      // if (
      //   (moesifEvent.direction === 'Outgoing' && logOutgoingRequests) ||
      //   (moesifEvent.direction === 'Incoming' && logIncomingRequests)
      // ) {
        // Add event to specific appId.
        try {
          applicationIdMap[appId].push(moesifEvent); // Add it
        } catch (e) {
          // Object does not exist. Add it.
          applicationIdMap[appId] = [moesifEvent]; // Initialize it
        }
      // }
    });

    const promises = [];
    let batchCounter = 0;

    Object.keys(applicationIdMap).forEach((appId) => {
      const batchEvents = applicationIdMap[appId];

      if (batchEvents.length) {
        const moesifHeaders = {
          Accept: 'application/json; charset=utf-8',
          'X-Moesif-Application-Id': appId,
          'User-Agent': 'moesif-cloudflare/2.0.3',
          'X-Moesif-Cf-Install-Id': INSTALL_ID,
          'X-Moesif-Cf-Install-Product': INSTALL_PRODUCT && INSTALL_PRODUCT.id,
          'X-Moesif-Cf-Install-Type': 'esm',
        };

        this.moesifLog(JSON.stringify(moesifHeaders));

        const body = JSON.stringify(batchEvents);
        this.moesifLog(body);

        const options = {
          method: 'POST',
          headers: moesifHeaders,
          body: body,
        };

        promises.push(fetch(BATCH_URL, options));
        batchCounter++;
      }
    });

    this.moesifLog(`Total batches: ${batchCounter}`);

    // ------------------------
    //      Important
    // This reset should be the last statement in the function before return.
    // ------------------------
    this.batchRunning = false;
    this.lastBatchSentDate = new Date();

    if (promises.length) {
      // Add a sleep/wait promise too - to make sure promise is resolved in max BATCH_DURATION
      // because we want to use "fire and forget" approach for sending events to moesif.
      promises.push(sleep(BATCH_DURATION));
      return Promise.race(promises);
    }
  }
}

export default Batcher;
