import { isMoesif, makeLogger, sleep, headersToObject, runHook, uuid4, prepareBody } from './utils.mjs';
import prepareOptions from './prepareOptions.mjs';
import Batcher from './batcher.mjs';
import AppConfig from './appConfig.mjs';

let EmptyResponse = class Response {
	constructor() {
		this.isEmpty = true;
		this.headers = new Headers();
		this.status = 599;
		this.statusText = undefined;
		this.url = undefined;
	}
};

const TRANSACTION_ID_HEADER = 'X-Moesif-Transaction-Id';

// main export
function moesifMiddleware(originalFetch, userOptions) {
	const options = prepareOptions(userOptions);

	const {
		applicationId,
		hideCreditCards,
		disableTransactionId,
		getSessionToken,
		identifyUser,
		identifyCompany,
		getMetadata,
		getApiVersion,
		skip,
		maskContent,
		logBody,
		urlPatterns = [],
		debug,
		fetchTimeoutMS,
		appIdUrlRegexArr,
	} = options;

	const moesifLog = makeLogger('MoesifWorker', options);

	const batcher = new Batcher(options);
	const appConfig = new AppConfig(options);
	appConfig.fetchAppConfig();

	const overrideApplicationId = (moesifEvent) => {
		// you may want to use a different app ID based on the request being made
		const appIdUrlRegex = appIdUrlRegexArr.find(({ regex }) => regex.test(moesifEvent.request.uri));

		return appIdUrlRegex
			? appIdUrlRegex.applicationId // may be an empty string, which means don't track this
			: applicationId;
	};

	async function makeMoesifEvent(
		_env,
		ctx,
		request,
		response,
		before,
		after,
		txId,
		requestBody,
		responseBody,
		userId,
		companyId,
		samplingPercentage
	) {
		moesifLog(`makeMoesifEvent start`);
		moesifLog(JSON.stringify({ request: request, response: response }));

		const moesifEvent = {
			userId: userId,

			companyId: companyId,

			sessionToken: runHook(() => getSessionToken(request, response, _env, ctx), 'getSessionToken', undefined),

			metadata: runHook(() => getMetadata(request, response, _env, ctx), 'getMetadata', undefined),

			request: {
				apiVersion: runHook(() => getApiVersion(request, response, _env, ctx), 'getApiVersion', undefined),
				body: requestBody ? prepareBody(requestBody, { hideCreditCards, maxBodySize: options.requestMaxBodySize }) : undefined,
				time: before,
				uri: request.url,
				verb: request.method,
				headers: headersToObject(request.headers),
				ip_address: request.headers.get('cf-connecting-ip'),
			},
			response: response.isEmpty
				? undefined
				: {
						time: after,
						body: responseBody ? prepareBody(responseBody, { hideCreditCards, maxBodySize: options.responseMaxBodySize }) : undefined,
						status: response.status,
						headers: headersToObject(response.headers),
				  },
			// direction: response.isEmpty ? 'Incoming' : 'Outgoing',
			weight: samplingPercentage === 0 || !samplingPercentage ? 1 : Math.floor(100 / samplingPercentage),
		};

		moesifEvent.request.headers[TRANSACTION_ID_HEADER] = txId;

		return runHook(() => maskContent(moesifEvent), 'maskContent', moesifEvent);
	}

	async function tryTrackRequest(
		_env,
		ctx,
		request,
		response,
		before,
		after,
		txId,
		requestBody,
		responseBody,
		userId,
		companyId,
		samplingPercentage
	) {
		if (!isMoesif(request) && !runHook(() => skip(request, response), 'skip', false)) {
			moesifLog(`tryTrackRequest start url=${request.url}`);

			const moesifEvent = await makeMoesifEvent(
				_env,
				ctx,
				request,
				response,
				before,
				after,
				txId,
				requestBody,
				responseBody,
				userId,
				companyId,
				samplingPercentage
			);

			const appId = runHook(() => overrideApplicationId(moesifEvent), 'overrideApplicationId', applicationId);

			ctx.waitUntil(batcher.enqueueData(appId, moesifEvent));
		}
	}

	return async function replacedFetch(request, _env, ctx) {
		const before = new Date();
		if (appConfig.shouldFetchAppConfig()) {
			ctx.waitUntil(appConfig.fetchAppConfig());
		}

		moesifLog(`logRequest start url=${request.url}`);

		let requestBody = undefined;

		if (logBody && request.body && request.body instanceof ReadableStream) {
			const clonedRequest = await request.clone();
			clonedRequest._logged = true;
			request._logged = true;
			requestBody = await clonedRequest.text();
		}

		moesifLog(`logging request url=${request.url}`);
		const race = Promise.race([originalFetch(request, _env, ctx), sleep(fetchTimeoutMS)]);
		const response = await race;

		let userId = null;
		userId = runHook(() => identifyUser(request, response, _env, ctx), 'identifyUser', undefined);

		let companyId = null;
		companyId = runHook(() => identifyCompany(request, response, _env, ctx), 'identifyCompany', undefined);

		const randomNumber = Math.random() * 100;
		const samplingPercentage = appConfig.getSamplingPercentage(userId, companyId);
		if (randomNumber > samplingPercentage) {
			moesifLog('Skip sending event to Moesif due to sampling percentage');
			return response;
		} else {
			const after = new Date();
			const txId = request.headers.get(TRANSACTION_ID_HEADER) || uuid4();

			let responseBody;
			if (response && logBody) {
				moesifLog(`response=${JSON.stringify(response)}`);
				responseBody = await response.text();
				moesifLog('responseBody');
			} else {
				moesifLog(`No response body logged logBody=${logBody}`);
			}

			ctx.waitUntil(
				tryTrackRequest(
					_env,
					ctx,
					request,
					response ? response : new EmptyResponse(),
					before,
					after,
					txId,
					requestBody,
					responseBody,
					userId,
					companyId
				)
			);

			if (!disableTransactionId && response) {
				const newResponse = new Response(logBody ? responseBody : response.body, response);
				newResponse.headers.set(TRANSACTION_ID_HEADER, txId);
				return newResponse;
			} else {
				const newResponse = new Response(logBody ? responseBody : response.body, response);
				return newResponse;
			}
		}
	};
}

export default moesifMiddleware;
