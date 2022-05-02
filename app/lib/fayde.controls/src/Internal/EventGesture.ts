module Fayde.Controls.Internal {
    export class EventGesture<T extends UIElement> {
        Target: UIElement;
        private _Callback: (t: T, e: any) => void;

        Attach (event: nullstone.Event<nullstone.IEventArgs>, callback: (t: T, e: nullstone.IEventArgs) => void) {
            this._Callback = callback;
            event.on(this._OnEvent, this);
            this.Detach = () => {
                event.off(this._OnEvent, this);
                this.Detach = () => {
                };
            };
        }

        Detach () {
        }

        private _OnEvent (sender: any, e: RoutedEventArgs) {
            this._Callback && this._Callback(sender, e);
        }
    }
} 