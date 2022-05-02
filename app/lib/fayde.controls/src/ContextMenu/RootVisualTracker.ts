module Fayde.Controls.contextmenu {
    export class RootVisualTracker {
        mousePosition = new Point();

        private $$rootVisual: FrameworkElement = null;
        private $$onSizeChanged: (newSize: minerva.Size) => any;

        get rootVisual () {
            return this.$$rootVisual;
        }

        set rootVisual (value: FrameworkElement) {
            if (this.$$rootVisual) {
                this.$$rootVisual.MouseMove.off(this._HandleRootVisualMouseMove, this);
                this.$$rootVisual.SizeChanged.off(this._HandleSizeChanged, this);
            }
            this.$$rootVisual = value;
            if (value) {
                value.MouseMove.on(this._HandleRootVisualMouseMove, this);
                value.SizeChanged.on(this._HandleSizeChanged, this);
            }
        }

        constructor (owner: FrameworkElement) {
            owner.LayoutUpdated.on(this._HandleLayoutUpdated, this);
        }

        tryInit (visual: UIElement) {
            if (!visual)
                return;
            var surface = <Surface>visual.XamlNode.LayoutUpdater.tree.surface;
            if (!surface)
                return;
            this.rootVisual = <FrameworkElement>surface.App.RootVisual;
        }

        setOnSizeChanged (onSizeChanged?: (newSize: minerva.Size) => any) {
            this.$$onSizeChanged = onSizeChanged;
        }

        getAvailableSize (): minerva.Size {
            return new minerva.Size(
                this.rootVisual.ActualWidth,
                this.rootVisual.ActualHeight
            );
        }

        private _HandleLayoutUpdated (sender: FrameworkElement, e: any) {
            if (!this.rootVisual) {
                var surface = <Surface>sender.XamlNode.LayoutUpdater.tree.surface;
                if (surface)
                    this.rootVisual = <FrameworkElement>surface.App.RootVisual;
            }
            if (this.rootVisual)
                sender.LayoutUpdated.off(this._HandleLayoutUpdated, this);
        }

        private _HandleRootVisualMouseMove (sender: any, e: Fayde.Input.MouseEventArgs) {
            this.mousePosition = e.GetPosition(null);
        }

        private _HandleSizeChanged (sender: any, e: SizeChangedEventArgs) {
            this.$$onSizeChanged && this.$$onSizeChanged(e.NewSize);
        }
    }
}