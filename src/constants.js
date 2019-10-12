const DEFAULT_COOKIE_STORE_ID = !!window.incognito ? 'firefox-private' : 'firefox-default'
const INTERNAL_MESSAGING_PORT_NAME = 'cts-communication'
const SIDEBAR_URL_PATTERN = `moz-extension://${location.host}/*`