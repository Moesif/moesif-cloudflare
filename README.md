# Moesif Cloudflare App

[![Software License][ico-license]][link-license]
[![Source Code][ico-source]][link-source]

[Moesif Cloudflare app](https://www.cloudflare.com/apps/moesif) automatically logs API calls to [Moesif](https://www.moesif.com) for API analytics and monitoring.
[Source Code on GitHub](https://github.com/moesif/moesif-cloudflare)


You can install Moesif using the Cloudflare Marketplace (simple install) or you can add the `src/index.js`  script directly (custom install).
The custom install provides the most flexibility, allowing you to write custom logic to identify users, session tokens, etc.

Your `Moesif Application Id` can be found in the [_Moesif Portal_](https://www.moesif.com/).
After signing up for a Moesif account, your Moesif Application Id will be displayed during the onboarding steps.

## Install via Cloudflare App (Simple install)

* Go to the [Moesif app on Cloudflare](https://www.cloudflare.com/apps/moesif) and click _Preview_
* Update `Your Moesif Application Id` here. 
* Click _Finish Installing onto your site_ button.

## Install via Cloudflare Workers (Custom install) using Cloudflare Dashboard

### 1. Create new Worker using Moesif Javascript code

1. Go to [Cloudflare Workers Dashboard](https://dash.cloudflare.com/workers). 
2. Select `Manage Workers` > `Create a Worker`
3. In the `Script` window, replace the pre-populated code with the contents of the Moesif worker [src/index.js](src/index.js) to your worker.
4. Required - Add the Moesif Application Id: Either `a` or `b` or both
* a. [Recommended ] Update `"INSTALL_OPTIONS.applicationId": "",` to use single `Moesif Application Id` for entire site
* b. [Optional - advanced use] Update `INSTALL_OPTIONS.urlPatterns`, for finer grained control over using multiple Moesif Application Ids and customized routes
5. Name of new worker: Cloudflare auto-generates a random name for new worker such as `gentle-unit-7e11`. You may choose to rename it to something friendly like `moesif-api-analytics-logger`

### 2. Set the Route for the newly created Worker
6. Go back to [Cloudflare Workers Dashboard](https://dash.cloudflare.com/workers) and select `Add Route`.
* `Route` : Set a valid route. We recommend matching all requests for your domain. For example if your domain is `acmeinc.com`, your pattern should be `*acmeinc.com/*`.
* `Worker`: Select the worker created above.
* Save. 

#### Try it!
Just visit your link on cloudflare using your web browser `https://my-cloudflare-domain/my-path` or
```bash
curl https://my-cloudflare-domain/my-path
```
The API calls should show up in Moesif event stream. 

## [Alternative] Install via Cloudflare Workers (Custom install) using `wrangler` CLI
Using `Cloudflare/Wrangler` CLI allows for automated install using `wrangler publish`, as well as view/`tail` using `wrangler tail` command 
* Visit [WRANGLER.md](WRANGLER.md) for details.


## Advanced Usage
* Visit [AdvancedUsage.md](AdvancedUsage.md)

## Troubleshooting
* Visit [Troubleshooting.md](Troubleshooting.md)

#### Support
If you have any issues with set up, please reach out to support@moesif.com with the subject `Cloudflare Workers`.

To view more documentation on integration options, please visit __[the Integration Options Documentation](https://www.moesif.com/docs/getting-started/integration-options/).__

[ico-license]: https://img.shields.io/badge/License-Apache%202.0-green.svg
[ico-source]: https://img.shields.io/github/last-commit/moesif/moesif-cloudflare.svg?style=social

[link-license]: https://raw.githubusercontent.com/Moesif/moesif-cloudflare/master/LICENSE
[link-source]: https://github.com/moesif/moesif-cloudflare