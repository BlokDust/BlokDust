import {FocusManagerEventArgs} from './FocusManagerEventArgs';
import {IApp} from '../IApp';

declare var App: IApp;

export class FocusManager {

    public HasFocus: boolean = true;
    FocusChanged = new nullstone.Event<FocusManagerEventArgs>();
    private _TitleInput: HTMLElement;
    private _SearchInput: HTMLElement;

    constructor() {

        this._TitleInput = document.getElementById("shareTitleInput");

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

    // IS CANVAS FOCUSSED WITHIN PAGE //
    //TODO make event based (on active element change)
    IsActive() {
        return ((<HTMLElement>document.activeElement) !== this._TitleInput);
    }
}