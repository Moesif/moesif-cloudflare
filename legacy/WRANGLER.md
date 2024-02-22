# Install via Cloudflare Workers using `wrangler` CLI (Custom install)

The Moesif Cloudflare worker can also be created without using the Cloudflare Dashboard, using the [Cloudflare/Wrangler CLI tool](https://github.com/cloudflare/wrangler). More details on [Wrangler on cloudflare site](https://developers.cloudflare.com/workers/cli-wrangler)


Using `Cloudflare/Wrangler` CLI allows for automated install using `wrangler publish`, as well as view/`tail` using `wrangler tail` command 

## For users of Visual Studio Code / VSCode `devcontainer`
For users who are familiar with using [VSCode IDE / Visual Studio Code](https://code.visualstudio.com/) and  [developing inside a container](https://code.visualstudio.com/docs/remote/containers), this project includes `.devcontainer` with automated `wrangler` and `cloudflared` installation.

## Manual Setup: Install the Cloudflare Wrangler CLI tool and cloudflared
You will need to install `wrangler` tool using the links above to publish the worker.
Additionally, to view (`wrangler tail`) log files of a worker running in cloudflare, you will need to install [cloudflared](https://github.com/cloudflare/cloudflared)

### Deploying Moesif Worker using `wrangler`
1. Clone this repo
```bash
git clone git@github.com:Moesif/moesif-cloudflare
cd moesif-cloudflare
``` 
2. Modify `src/index.js`:
At minimum add the Moesif Application Id `"applicationId"` See [README.md](README.md)

3. Modify `wrangler.toml`:
* Update fields `account_id` and `zone_id` obtained from your cloudflare dashboard
* Update field `routes` with routes you would like to use. See [README.md](README.md)

4. Login to cloudflare using `wrangler` (as needed)
```bash
wrangler login
```

5. Deploy to cloudflare. To create new worker and associate routes:
```bash
wrangler publish
```
The worker should be running and logging to moesif

#### Try it!
Just visit your link on cloudflare using your web browser `https://my-cloudflare-domain/my-path` or
```bash
curl https://my-cloudflare-domain/my-path
```
The API calls should show up in Moesif event stream. 

### View Cloudflare logs
For a wrangler deployed worker, view logs from cloudflare using.
```bash
wrangler tail --format pretty
```
Here is sample logs output:
```bash
[2021-08-04 02:09:12] [SJC] [Ok] GET https://my-domain.io/hello
 | [Info] [MoesifWorker] fetchAppConfig start 
 | [Info] [MoesifWorker] logRequest start url=https://my-domain.io/hello 
 | [Info] [MoesifWorker] logging request url=https://my-domain.io/hello 
 | [Info] [MoesifWorker] response={"webSocket":null,"url":"https://my-domain.io/hello","redirected":false,"ok":true,"headers":{},"statusText":"OK","status":200,"bodyUsed":false,"body":{"locked":false}} 
 | [Info] [MoesifWorker] tryTrackRequest start url=https://my-domain.io/hello 
 | [Info] [MoesifWorker] makeMoesifEvent start 
```

For detailed debug logs and troubleshooting, prior to deploying the worker, modify `src/index.js`
```javascript
   "debug": true
```
Remember to disable `debug` for production.