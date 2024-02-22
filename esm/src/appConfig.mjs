import { makeLogger } from './utils.mjs';

const APP_CONFIG_URL = 'https://api.moesif.net/v1/config';

class AppConfig {
  constructor(options = {}) {
    this.applicationId = options.applicationId;
    this.appConfig = null;
    this.lastUpdatedAppConfigTime = null;
    this.fetchAppConfigTimeDeltaInMins = options.fetchAppConfigTimeDeltaInMins || 300000;

    this.moesifLog = makeLogger('MoesifAppConfig', options);
  }

  shouldFetchAppConfig() {
    return (
      !this.isAppConfigFetched ||
      !this.lastUpdatedAppConfigTime ||
      new Date().getTime() > this.lastUpdatedAppConfigTime + this.fetchAppConfigTimeDeltaInMins
    );
  }

  async fetchAppConfig() {
    this.lastUpdatedAppConfigTime = new Date().getTime();
    this.moesifLog(`fetchAppConfig start`);

    const moesifHeaders = {
      'X-Moesif-Application-Id': this.applicationId,
    };

    const options = {
      method: 'GET',
      headers: moesifHeaders,
    };

    const response = await fetch(APP_CONFIG_URL, options);
    this.appConfig = await this.readAppConfigResponse(response);
    this.isAppConfigFetched = true;
  }

  async readAppConfigResponse(response) {
    const { headers } = response;
    const contentType = headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    } else {
      return null;
    }
  }

  getSamplingPercentage(userId, companyId) {
    try {
      if (this.appConfig) {
        if ('user_sample_rate' in this.appConfig && userId in this.appConfig['user_sample_rate']) {
          return this.appConfig['user_sample_rate'][userId];
        } else if (
          'company_sample_rate' in this.appConfig &&
          companyId in this.appConfig['company_sample_rate']
        ) {
          return this.appConfig['company_sample_rate'][companyId];
        } else if ('sample_rate' in this.appConfig) {
          return this.appConfig['sample_rate'];
        }
      }
      return 100;
    } catch (error) {
      this.moesifLog(`Error while getting sampling percentage`);
      this.moesifLog(error);
      return 100;
    }
  }
}

export default AppConfig;
