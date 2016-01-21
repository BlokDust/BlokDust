import {FocusManagerEventArgs} from './FocusManagerEventArgs';

export class FocusManager {

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

        document.addEventListener('visibilitychange', () => {
            this.HasFocus = !document.hidden;
            this.FocusChanged.raise(this, new FocusManagerEventArgs(this.HasFocus));
        }, false);
    }
}