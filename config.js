(function () {
    const API_URLS = {
        local: "http://localhost:5000",
        prod: "https://tylt-feedback-form-server.railway.internal"
    };

    // Change only this flag: true = prod API, false = local API
    const USE_PROD_API = true;
    const selectedTarget = USE_PROD_API ? "prod" : "local";

    window.APP_CONFIG = {
        API_URLS,
        API_TARGET: selectedTarget,
        API_BASE_URL: API_URLS[selectedTarget],
        APP_BASE_URL: window.location.origin
    };
})();