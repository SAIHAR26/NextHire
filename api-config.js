(function configureNextHireApi(global) {
  const DEPLOYED_API_URL = "https://nexthire-9nyk.onrender.com";

  function cleanUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  const configuredUrl = cleanUrl(global.NEXTHIRE_API_URL || DEPLOYED_API_URL);

  global.NextHireApiConfig = {
    apiBaseUrl: configuredUrl,
  };
})(window);
