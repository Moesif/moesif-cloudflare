[Writing Cloudflare Workers](https://developers.cloudflare.com/workers/writing-workers/)
[Testing Sandbox](https://cloudflareworkers.com/#12a9195720fe4ed660949efdbd9c0219:https://tutorial.cloudflareworkers.com/)

Example Workers:

- [LogDNA](https://github.com/adaptive/cf-logdna-worker/blob/master/index.js) - log and make a request

## What is a Cloudflare Worker?

[How Workers Work](https://developers.cloudflare.com/workers/about/how-workers-work/)

## Worker Limitations

(a subrequest is a request directly or indirectly made by the worker)

*See [Resource Limits](https://developers.cloudflare.com/workers/writing-workers/resource-limits/)*

- N subrequests
- 5-50 ms CPU time (depending on plan)
- 15 seconds real time per request (made by the worker)
- 128 MB memory
- A worker must make all of its subrequests within the first fifteen seconds of its execution
    - after 15 seconds, existing requests will still resolve, but new requests cannot be made