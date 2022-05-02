/// <reference path="Promise" />

(function (global: any) {
    if (global.Promise && typeof global.Promise.prototype.tap !== "function") {
        global.Promise.prototype.tap = nullstone.PromiseImpl.prototype.tap;
    }
})(this);