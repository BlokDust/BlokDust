/// <reference path="Date_now.ts" />

(function (context) {
    if (!("performance" in context))
        context.performance = {};
    if (!("now" in context.performance)) {

        var nowOffset = Date.now();
        if (performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart
        }

        context.performance.now = ()  => Date.now() - nowOffset;
    }
})(window);