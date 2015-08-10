
import FocusManagerEventArgs = require("./FocusManagerEventArgs");

class FocusManager {

    public HasFocus: boolean = true;
    FocusChanged = new nullstone.Event<FocusManagerEventArgs>();

    constructor() {

        var that = this;

        //document.body.addEventListener("focus", function() {
        //    that.HasFocus = true;
        //    that.FocusChanged.raise(that, new FocusManagerEventArgs(that.HasFocus));
        //}, true);
        //
        //document.body.addEventListener("blur", function() {
        //    that.HasFocus = false;
        //    that.FocusChanged.raise(that, new FocusManagerEventArgs(that.HasFocus));
        //}, true);

        document.onfocus = function() {
            that.HasFocus = true;
            that.FocusChanged.raise(that, new FocusManagerEventArgs(that.HasFocus));
        };

        document.onblur = function() {
            that.HasFocus = false;
            that.FocusChanged.raise(that, new FocusManagerEventArgs(that.HasFocus));
        };

        //$(function() {
        //    $('canvas').focus(function() {
        //        that.HasFocus = true;
        //        that.FocusChanged.raise(that, new FocusManagerEventArgs(that.HasFocus));
        //    });
        //
        //    $('canvas').blur(function() {
        //        that.HasFocus = false;
        //        that.FocusChanged.raise(that, new FocusManagerEventArgs(that.HasFocus));
        //    });
        //});
    }
}

export = FocusManager;