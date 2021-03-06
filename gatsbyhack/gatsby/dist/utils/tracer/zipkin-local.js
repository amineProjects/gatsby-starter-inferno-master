"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

const zipkin = require(`zipkin`);

const _require = require(`zipkin-transport-http`),
      HttpLogger = _require.HttpLogger;

const ZipkinTracer = require(`zipkin-javascript-opentracing`);

const fetch = require(`node-fetch`);

let logger;
let recorder;
/**
 * Create and return an open-tracing compatible tracer. See
 * https://github.com/opentracing/opentracing-javascript/blob/master/src/tracer.ts
 */

function create() {
  logger = new HttpLogger({
    // endpoint of local docker zipkin instance
    endpoint: `http://localhost:9411/api/v1/spans`
  });
  recorder = new zipkin.BatchRecorder({
    logger,
    // timeout = 60 hours, must be longer than site's build time
    timeout: 60 * 60 * 60 * 1000000
  });
  const tracer = new ZipkinTracer({
    localServiceName: `gatsby`,
    serviceName: `gatsby`,
    // Sample 1 out of 1 spans (100%). When tracing production
    // services, it is normal to sample 1 out of 10 requests so that
    // tracing information doesn't impact site performance. But Gatsby
    // is a build tool and only has "1" request (the
    // build). Therefore, we must set this to 100% so that spans
    // aren't missing
    sampler: new zipkin.sampler.CountingSampler(1),
    traceId128Bit: true,
    recorder,
    kind: `client`
  });
  return tracer;
}
/**
 * Run any tracer cleanup required before the node.js process
 * exits. For Zipkin HTTP, we must manually process any spans still on
 * the queue
 */


function stop() {
  return _stop.apply(this, arguments);
} // Workaround for issue in Zipkin HTTP Logger where Spans are not
// cleared off their processing queue before the node.js process
// exits. Code is mostly the same as the zipkin processQueue
// implementation.


function _stop() {
  _stop = (0, _asyncToGenerator2.default)(function* () {
    // First, write all partial spans to the http logger
    recorder.partialSpans.forEach((span, id) => {
      if (recorder._timedOut(span)) {
        recorder._writeSpan(id);
      }
    }); // Then tell http logger to process all spans in its queue

    return yield _processQueue();
  });
  return _stop.apply(this, arguments);
}

function _processQueue() {
  return _processQueue2.apply(this, arguments);
}

function _processQueue2() {
  _processQueue2 = (0, _asyncToGenerator2.default)(function* () {
    const self = logger;

    if (self.queue.length > 0) {
      const postBody = `[${self.queue.join(`,`)}]`;
      return yield fetch(self.endpoint, {
        method: `POST`,
        body: postBody,
        headers: self.headers,
        timeout: self.timeout
      }).then(response => {
        if (response.status !== 202) {
          const err = `Unexpected response while sending Zipkin data, status:` + `${response.status}, body: ${postBody}`;
          if (self.errorListenerSet) self.emit(`error`, new Error(err));else console.error(err);
        }
      }).catch(error => {
        const err = `Error sending Zipkin data ${error}`;
        if (self.errorListenerSet) this.emit(`error`, new Error(err));else console.error(err);
      });
    }

    return true;
  });
  return _processQueue2.apply(this, arguments);
}

module.exports = {
  create,
  stop
};
//# sourceMappingURL=zipkin-local.js.map