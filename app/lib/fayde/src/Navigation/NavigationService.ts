module Fayde.Navigation {
    export class NavigationService {
        Href: string;
        Hash: string;
        LocationChanged = new nullstone.Event();

        constructor() {
            this.Href = window.location.href;
            this.Hash = window.location.hash;
            if (this.Href[this.Href.length - 1] === '#')
                this.Hash = "#";
            if (this.Hash) {
                this.Hash = this.Hash.substr(1);
                this.Href = this.Href.substring(0, this.Href.indexOf('#'));
            }
            window.onhashchange = () => this._HandleFragmentChange();
        }

        get CurrentUri(): Uri {
            return new Uri(this.Href + "#" + this.Hash);
        }

        Navigate(uri: Uri): boolean {
            window.location.hash = uri.toString();
            return true;
        }

        private _HandleFragmentChange() {
            this.Hash = window.location.hash;
            if (this.Hash) {
                this.Hash = this.Hash.substr(1);
            }
            this.LocationChanged.raise(this, null);
        }
    }
    Fayde.CoreLibrary.add(NavigationService);
}