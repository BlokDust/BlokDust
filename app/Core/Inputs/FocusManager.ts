
import FocusManagerEventArgs = require("./FocusManagerEventArgs");

class FocusManager {

    public HasFocus: boolean = true;
    FocusChanged = new nullstone.Event<FocusManagerEventArgs>();

    constructor() {

        window.onfocus = () => {
            //$('#debug').html('focus');
            this.HasFocus = true;
            this.FocusChanged.raise(this, new FocusManagerEventArgs(this.HasFocus));
        };

        window.onblur = () => {
            //$('#debug').html('blur');
            this.HasFocus = false;
            this.FocusChanged.raise(this, new FocusManagerEventArgs(this.HasFocus));
        };
    }
}

export = FocusManager;