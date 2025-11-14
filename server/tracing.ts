// Datadog tracing initialization. Loads before the rest of the app.
// Uses environment variables: DD_ENV, DD_SERVICE, DD_VERSION, DD_SITE.
// Full APM traces require an Agent or OTLP pipeline; this sets up instrumentation hooks.
import 'dd-trace/init';

export {}; // side-effect only module
