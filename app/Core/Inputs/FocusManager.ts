import {FocusManagerEventArgs} from './FocusManagerEventArgs';
import {IApp} from '../../IApp';

declare var App: IApp;

export class FocusManager {

    public HasFocus: boolean = true;
    FocusChanged = new nullstone.Event<FocusManagerEventArgs>();
    private _TitleInput: HTMLElement;
    private _SearchInput: HTMLElement;

    constructor() {

        this._TitleInput = document.getElementById("shareTitleInput");
        this._SearchInput = document.getElementById("soundCloudSearchInput");

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

        document.addEventListener('focusout', () => {
            window.scrollTo(0,0);
        });
    }

    // IS CANVAS FOCUSED ELEMENT WITHIN PAGE //
    IsActive() {
        return ((<HTMLElement>document.activeElement) !== this._TitleInput && (<HTMLElement>document.activeElement) !== this._SearchInput);
    }

    // THE ACTIVE ELEMENT ISN'T THE PAGE BODY //
    ActiveIsNotBody() {
        return ((<HTMLElement>document.activeElement) !== document.body);
    }

    BlurActive() {
        (<HTMLElement>document.activeElement).blur();
    }

    // IS CANVAS THE TARGET OF A TOUCH EVENT //
    IsTouchTarget(e: TouchEvent|MouseWheelEvent) {
        return (e.target === App.Canvas.HTMLElement);
    }
}