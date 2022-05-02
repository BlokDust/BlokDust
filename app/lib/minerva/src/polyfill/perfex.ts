(function (context) {
    if (!context.perfex) {
        context.perfex = {};
    }
    if (!context.perfex.timer) {
        context.perfex.timer = <any>{
            all: [],
            reset () {
            },
            start (tag: string) {
            },
            stop () {
            }
        };
    }
    if (!context.perfex.phases) {
        context.perfex.phases = <any>{
            current: null,
            all: [],
            start (tag: string) {
            }
        };
    }
})(window);