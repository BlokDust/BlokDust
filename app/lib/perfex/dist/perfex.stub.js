(function (context) {
    if (!context.perfex) {
        context.perfex = {};
    }
    if (!context.perfex.timer) {
        context.perfex.timer = {
            all: [],
            reset: function () {
            },
            start: function (tag) {
            },
            stop: function () {
            }
        };
    }
    if (!context.perfex.phases) {
        context.perfex.phases = {
            current: null,
            all: [],
            start: function (tag) {
            }
        };
    }
})(window);