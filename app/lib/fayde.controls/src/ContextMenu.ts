/// <reference path="Primitives/MenuBase.ts" />

module Fayde.Controls {
    export class ContextMenu extends Primitives.MenuBase {
        static HorizontalOffsetProperty = DependencyProperty.Register("HorizontalOffset", () => Number, ContextMenu, 0.0);
        static VerticalOffsetProperty = DependencyProperty.Register("VerticalOffset", () => Number, ContextMenu, 0.0);
        static IsOpenProperty = DependencyProperty.Register("IsOpen", () => Boolean, ContextMenu, false);
        HorizontalOffset: number;
        VerticalOffset: number;
        IsOpen: boolean;

        private OnHorizontalOffsetChanged (args: IDependencyPropertyChangedEventArgs) {
            this.UpdateContextMenuPlacement();
        }

        private OnVerticalOffsetChanged (args: IDependencyPropertyChangedEventArgs) {
            this.UpdateContextMenuPlacement();
        }

        private OnIsOpenChanged (args: IDependencyPropertyChangedEventArgs) {
            if (this._SettingIsOpen)
                return;
            if (args.NewValue === true)
                this.OpenPopup(this.$RootVisualTracker.mousePosition);
            else
                this.ClosePopup();
        }

        Opened = new RoutedEvent<RoutedEventArgs>();
        Closed = new RoutedEvent<RoutedEventArgs>();

        private $RootVisualTracker: contextmenu.RootVisualTracker;

        constructor () {
            super();
            this.DefaultStyleKey = ContextMenu;
            this.$RootVisualTracker = new contextmenu.RootVisualTracker(this);
        }

        OnKeyDown (e: Input.KeyEventArgs) {
            switch (e.Key) {
                case Input.Key.Escape:
                    this.ClosePopup();
                    e.Handled = true;
                    break;
                case Input.Key.Up:
                    this.FocusNextItem(false);
                    e.Handled = true;
                    break;
                case Input.Key.Down:
                    this.FocusNextItem(true);
                    e.Handled = true;
                    break;
            }
            super.OnKeyDown(e)
        }

        OnMouseLeftButtonDown (e: Input.MouseButtonEventArgs) {
            e.Handled = true;
            super.OnMouseLeftButtonDown(e);
        }

        OnMouseRightButtonDown (e: Input.MouseButtonEventArgs) {
            e.Handled = true;
            super.OnMouseRightButtonDown(e);
        }

        private _Owner: DependencyObject = null;
        get Owner (): DependencyObject {
            return this._Owner;
        }

        set Owner (value: DependencyObject) {
            if (this._Owner) {
                var fe = this._Owner instanceof FrameworkElement ? <FrameworkElement>this._Owner : null;
                if (fe)
                    fe.MouseRightButtonDown.off(this._HandleOwnerMouseRightButtonDown, this);
            }
            this._Owner = value;
            if (!this._Owner)
                return;
            fe = this._Owner instanceof FrameworkElement ? <FrameworkElement>this._Owner : null;
            if (fe)
                fe.MouseRightButtonDown.on(this._HandleOwnerMouseRightButtonDown, this);
        }

        private _PopupAlignmentPoint = new Point();
        private _SettingIsOpen: boolean = false;
        private _Popup: Controls.Primitives.Popup = null;
        private _Overlay: Panel = null;

        private _HandleOwnerMouseRightButtonDown (sender: any, e: Fayde.Input.MouseButtonEventArgs) {
            this.OpenPopup(e.GetPosition(null));
            e.Handled = true;
        }

        private _HandleOverlayMouseButtonDown (sender: any, e: Fayde.Input.MouseButtonEventArgs) {
            this.ClosePopup();
            e.Handled = true;
        }

        private _HandleContextMenuSizeChanged (sender: any, e: Fayde.SizeChangedEventArgs) {
            this.UpdateContextMenuPlacement();
        }

        ChildMenuItemClicked () {
            this.ClosePopup();
        }

        private UpdateContextMenuPlacement () {
            var pap = this._PopupAlignmentPoint;
            var full = this.$RootVisualTracker.getAvailableSize();

            var x = Math.max(0, Math.min(pap.x + this.HorizontalOffset, full.width - this.ActualWidth));
            var y = Math.max(0, Math.min(pap.y + this.VerticalOffset, full.height - this.ActualHeight));
            Controls.Canvas.SetLeft(this, x);
            Controls.Canvas.SetTop(this, y);

            var overlay = this._Overlay;
            if (!overlay)
                return;
            overlay.Width = full.width;
            overlay.Height = full.height;
        }

        private OpenPopup (position: Point) {
            this._PopupAlignmentPoint = position;

            var canvas1 = new Canvas();
            canvas1.Background = new Fayde.Media.SolidColorBrush(Color.KnownColors.Transparent);
            this._Overlay = canvas1;
            this._Overlay.MouseLeftButtonDown.on(this._HandleOverlayMouseButtonDown, this);
            this._Overlay.MouseRightButtonDown.on(this._HandleOverlayMouseButtonDown, this);
            this._Overlay.Children.Add(this);

            var popup = this._Popup = new Controls.Primitives.Popup();
            var initiator = <XamlObject>this._Owner;
            while (initiator && !(initiator instanceof UIElement))
                initiator = initiator.Parent;
            if (initiator) {
                popup.XamlNode.RegisterInitiator(<UIElement>initiator);
                this.$RootVisualTracker.tryInit(<UIElement>initiator);
            }
            popup.Child = this._Overlay;

            this.SizeChanged.on(this._HandleContextMenuSizeChanged, this);
            this.$RootVisualTracker.setOnSizeChanged((newSize) => this.UpdateContextMenuPlacement());
            this.UpdateContextMenuPlacement();
            if (this.ReadLocalValue(DependencyObject.DataContextProperty) === DependencyProperty.UnsetValue) {
                var binding1 = new Fayde.Data.Binding("DataContext");
                binding1.Source = this.Owner || this.$RootVisualTracker.rootVisual;
                this.SetBinding(DependencyObject.DataContextProperty, binding1);
            }
            popup.IsOpen = true;
            this.Focus();
            this._SettingIsOpen = true;
            this.IsOpen = true;
            this._SettingIsOpen = false;
            this.OnOpened(new RoutedEventArgs());
        }

        OnOpened (e: RoutedEventArgs) {
            this.Opened.raise(this, e);
        }

        private ClosePopup () {
            if (this._Popup) {
                this._Popup.IsOpen = false;
                this._Popup.Child = null;
                this._Popup = null;
            }
            if (this._Overlay) {
                this._Overlay.Children.Clear();
                this._Overlay = null;
            }
            this.SizeChanged.off(this._HandleContextMenuSizeChanged, this);
            this.$RootVisualTracker.setOnSizeChanged();
            this._SettingIsOpen = true;
            this.IsOpen = false;
            this._SettingIsOpen = false;
            this.OnClosed(new RoutedEventArgs());
        }

        OnClosed (e: RoutedEventArgs) {
            this.Closed.raise(this, e);
        }

        private FocusNextItem (down: boolean) {
            var count = this.Items.Count;
            var num = down ? -1 : count;

            var menuItem1 = <MenuItem>Fayde.Surface.GetFocusedElement(this);
            if (menuItem1 instanceof MenuItem && this === menuItem1.ParentMenuBase)
                num = this.ItemContainersManager.IndexFromContainer(menuItem1);
            var index = num;
            var menuItem2;
            do {
                index = (index + count + (down ? 1 : -1)) % count;
                menuItem2 = this.ItemContainersManager.ContainerFromIndex(index);
                if (!(menuItem2 instanceof MenuItem)) menuItem2 = null;
            }
            while ((!menuItem2 || (!menuItem2.IsEnabled || !menuItem2.Focus())) && index !== num);
        }
    }
}