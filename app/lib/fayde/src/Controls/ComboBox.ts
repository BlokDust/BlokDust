/// <reference path="Primitives/Selector.ts" />
/// <reference path="ContentPresenter.ts" />
/// <reference path="Primitives/Popup.ts" />
/// <reference path="Primitives/ToggleButton.ts" />
/// <reference path="ScrollViewer.ts" />

module Fayde.Controls {
    export class ComboBox extends Primitives.Selector {
        DropDownOpened = new nullstone.Event();
        DropDownClosed = new nullstone.Event();

        static IsDropDownOpenProperty = DependencyProperty.Register("IsDropDownOpen", () => Boolean, ComboBox, false, (d, args) => (<ComboBox>d)._IsDropDownOpenChanged(args));
        static ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", () => Style, ComboBox, undefined, (d, args) => (<ListBox>d).OnItemContainerStyleChanged(args));
        static MaxDropDownHeightProperty = DependencyProperty.Register("MaxDropDownHeight", () => Number, ComboBox, Number.POSITIVE_INFINITY, (d, args) => (<ComboBox>d)._MaxDropDownHeightChanged(args));
        static IsSelectionActiveProperty = Primitives.Selector.IsSelectionActiveProperty;
        IsDropDownOpen: boolean;
        ItemContainerStyle: Style;
        MaxDropDownHeight: number;

        private $ContentPresenter: ContentPresenter;
        private $Popup: Primitives.Popup;
        private $DropDownToggle: Primitives.ToggleButton;
        private $DisplayedItem: ComboBoxItem = null;
        private $SelectionBoxItem: any = null;
        private $SelectionBoxItemTemplate: DataTemplate = null;
        private _NullSelFallback: any;
        private _FocusedIndex: number = -1;

        constructor() {
            super();
            this.DefaultStyleKey = ComboBox;
        }

        private _IsDropDownOpenChanged(args: IDependencyPropertyChangedEventArgs) {
            var open = args.NewValue;

            if (this.$Popup != null)
                this.$Popup.IsOpen = open;
            if (this.$DropDownToggle != null)
                this.$DropDownToggle.IsChecked = open;

            if (open) {
                this._FocusedIndex = this.Items.Count > 0 ? Math.max(this.SelectedIndex, 0) : -1;
                if (this._FocusedIndex > -1) {
                    var focusedItem = this.ItemContainersManager.ContainerFromIndex(this._FocusedIndex);
                    if (focusedItem instanceof ComboBoxItem)
                        (<ComboBoxItem>focusedItem).Focus();
                }

                this.LayoutUpdated.on(this._UpdatePopupSizeAndPosition, this);
                this.DropDownOpened.raise(this, null);
            } else {
                this.Focus();
                this.LayoutUpdated.off(this._UpdatePopupSizeAndPosition, this);
                this.DropDownClosed.raise(this, null);
            }

            var selectedItem = this.SelectedItem;
            this._UpdateDisplayedItem(open && selectedItem instanceof Fayde.UIElement ? null : selectedItem);
            this.UpdateVisualState(true);
        }
        private _MaxDropDownHeightChanged(args: IDependencyPropertyChangedEventArgs) {
            this._UpdatePopupMaxHeight(args.NewValue);
        }
        
        private _GetChildOfType(name: string, type: Function): any {
            var temp = this.GetTemplateChild(name);
            if (temp instanceof type)
                return temp;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);

            this.$ContentPresenter = this._GetChildOfType("ContentPresenter", ContentPresenter);
            this.$Popup = this._GetChildOfType("Popup", Primitives.Popup);
            this.$DropDownToggle = this._GetChildOfType("DropDownToggle", Primitives.ToggleButton);

            if (this.$ContentPresenter != null)
                this._NullSelFallback = this.$ContentPresenter.Content;

            if (this.$Popup != null) {
                this._UpdatePopupMaxHeight(this.MaxDropDownHeight);
                this.$Popup.WatchOutsideClick(this._PopupClickedOutside, this);

                var child = this.$Popup.Child;
                if (child != null) {
                    child.KeyDown.on(this._OnChildKeyDown, this);
                    (<FrameworkElement>child).SizeChanged.on(this._UpdatePopupSizeAndPosition, this);
                }
            }

            if (this.$DropDownToggle != null) {
                this.$DropDownToggle.Checked.on(this._OnToggleChecked, this);
                this.$DropDownToggle.Unchecked.on(this._OnToggleUnchecked, this);
            }

            this.UpdateVisualState(false);
            this._UpdateDisplayedItem(this.SelectedItem);
        }

        OnItemContainerStyleChanged(args: IDependencyPropertyChangedEventArgs) {
            var newStyle = <Style>args.NewValue;
            var enumerator = this.ItemContainersManager.GetEnumerator();
            while (enumerator.moveNext()) {
                var container = <FrameworkElement>enumerator.current;
                if (container && container !== enumerator.CurrentItem)
                    container.Style = newStyle;
            }
        }
        IsItemItsOwnContainer(item: any): boolean {
            return item instanceof ComboBoxItem;
        }
        GetContainerForItem(): UIElement {
            return new ComboBoxItem();
        }
        PrepareContainerForItem(container: UIElement, item: any) {
            super.PrepareContainerForItem(container, item);
            var cbi = <ComboBoxItem>container;
            if (cbi !== item) {
                var ics = this.ItemContainerStyle;
                if (!cbi.Style && ics)
                    cbi.Style = ics;
            }
        }

        GoToStateFocus(gotoFunc: (state: string) => boolean): boolean {
            var isEnabled = this.IsEnabled;
            if (this.IsDropDownOpen && isEnabled)
                return gotoFunc("FocusedDropDown");
            else if (this.IsFocused && isEnabled)
                return gotoFunc("Focused");
            return gotoFunc("Unfocused");
        }

        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) {
            super.OnIsEnabledChanged(e);
            if (!this.IsEnabled)
                this.IsDropDownOpen = false;
        }

        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            if (!e.Handled) {
                e.Handled = true;
                this.SetValueInternal(ComboBox.IsSelectionActiveProperty, true);
                this.IsDropDownOpen = !this.IsDropDownOpen;
            }
        }
        OnMouseEnter(e: Input.MouseEventArgs) {
            super.OnMouseEnter(e);
            this.UpdateVisualState(true);
        }
        OnMouseLeave(e: Input.MouseEventArgs) {
            super.OnMouseLeave(e);
            this.UpdateVisualState(true);
        }
        OnKeyDown(e: Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (e.Handled)
                return;
            e.Handled = true;

            var key = e.Key;
            if (this.FlowDirection === FlowDirection.RightToLeft) {
                if (key === Input.Key.Left)
                    key = Input.Key.Right;
                else if (key === Input.Key.Right)
                    key = Input.Key.Left;
            }
            switch (key) {
                case Input.Key.Escape:
                    this.IsDropDownOpen = false;
                    break;
                case Input.Key.Enter:
                case Input.Key.Space:
                    if (this.IsDropDownOpen && this._FocusedIndex !== this.SelectedIndex) {
                        this.SelectedIndex = this._FocusedIndex;
                        this.IsDropDownOpen = false;
                    } else {
                        this.IsDropDownOpen = true;
                    }
                    break;
                case Input.Key.Right:
                case Input.Key.Down:
                    if (this.IsDropDownOpen) {
                        if (this._FocusedIndex < (this.Items.Count - 1)) {
                            this._FocusedIndex++;
                            (<UIElement>this.ItemContainersManager.ContainerFromIndex(this._FocusedIndex)).Focus();
                        }
                    } else {
                        this.SelectedIndex = Math.min(this.SelectedIndex + 1, this.Items.Count - 1);
                    }
                    break;
                case Input.Key.Left:
                case Input.Key.Up:
                    if (this.IsDropDownOpen) {
                        if (this._FocusedIndex > 0) {
                            this._FocusedIndex--;
                            (<UIElement>this.ItemContainersManager.ContainerFromIndex(this._FocusedIndex)).Focus();
                        }
                    } else {
                        this.SelectedIndex = Math.max(this.SelectedIndex - 1, 0);
                    }
                    break;
                default:
                    e.Handled = false;
                    break;
            }
        }
        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState(true);
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.SetValueInternal(ComboBox.IsSelectionActiveProperty, this.$Popup == null ? false : this.$Popup.IsOpen);
            this.UpdateVisualState(true);
        }

        private _OnChildKeyDown(sender, e: Input.KeyEventArgs) {
            this.OnKeyDown(e);
        }
        OnSelectionChanged(e: Primitives.SelectionChangedEventArgs) {
            if (!this.IsDropDownOpen)
                this._UpdateDisplayedItem(this.SelectedItem);
        }
        private _OnToggleChecked(sender, e) { this.IsDropDownOpen = true; }
        private _OnToggleUnchecked(sender, e) { this.IsDropDownOpen = false; }

        private _PopupClickedOutside() {
            this.IsDropDownOpen = false;
        }
        private _UpdateDisplayedItem(selectedItem: any) {
            if (!this.$ContentPresenter)
                return;

            if (this.$DisplayedItem != null) {
                this.$DisplayedItem.Content = this.$ContentPresenter.Content;
                this.$DisplayedItem = null;
            }
            this.$ContentPresenter.Content = null;

            if (selectedItem == null) {
                this.$ContentPresenter.Content = this._NullSelFallback;
                this.$ContentPresenter.ContentTemplate = null;
                this.$SelectionBoxItem = null;
                this.$SelectionBoxItemTemplate = null;
                return;
            }

            var content = selectedItem;
            if (content instanceof ComboBoxItem)
                content = content.Content;

            var icm = this.ItemContainersManager;
            var selectedIndex = this.SelectedIndex;
            var temp = icm.ContainerFromIndex(selectedIndex);
            if (temp instanceof ComboBoxItem) this.$DisplayedItem = <ComboBoxItem>temp;

            this.$SelectionBoxItem = content;
            this.$SelectionBoxItemTemplate = this.ItemTemplate;

            if (this.$DisplayedItem != null) {
                this.$SelectionBoxItemTemplate = this.$DisplayedItem.ContentTemplate;
                if (content instanceof Fayde.UIElement)
                    this.$DisplayedItem.Content = null;
                else
                    this.$DisplayedItem = null;
            } else {
                temp = icm.ContainerFromIndex(selectedIndex);
                var container: ComboBoxItem;
                if (temp instanceof ComboBoxItem) container = <ComboBoxItem>temp;
                if (!container) {
                    var generator = icm.CreateGenerator(selectedIndex, 1);
                    if (generator.Generate() && generator.Current instanceof ComboBoxItem) {
                        container = <ComboBoxItem>generator.Current;
                        this.PrepareContainerForItem(container, generator.CurrentItem);
                    }
                }
                if (container)
                    this.$SelectionBoxItemTemplate = container.ContentTemplate;
            }

            this.$ContentPresenter.Content = this.$SelectionBoxItem;
            this.$ContentPresenter.ContentTemplate = this.$SelectionBoxItemTemplate;
        }
        private _UpdatePopupSizeAndPosition(sender, e: nullstone.IEventArgs) {
            var popup = this.$Popup;
            if (!popup)
                return;
            var child = <FrameworkElement>popup.Child;
            if (!(child instanceof FrameworkElement))
                return;

            child.MinWidth = this.ActualWidth;

            var root = <FrameworkElement>VisualTreeHelper.GetRoot(this);
            if (!root)
                return;

            try {
                var xform = this.TransformToVisual(null);
            } catch (err) {
                //Ignore ComboBox being detached
                return;
            }

            var offset = new Point(0, this.ActualHeight);
            var bottomRight = new Point(offset.x + child.ActualWidth, offset.y + child.ActualHeight);

            var topLeft = xform.Transform(offset);
            bottomRight = xform.Transform(bottomRight);

            var isRightToLeft = (this.FlowDirection === FlowDirection.RightToLeft);
            if (isRightToLeft) {
                var left = bottomRight.x;
                bottomRight.x = topLeft.x;
                topLeft.x = left;
            }

            var finalOffset = new Point();
            var raw = root.ActualWidth;
            if (bottomRight.x > raw) {
                finalOffset.x = raw - bottomRight.x;
            } else if (topLeft.x < 0) {
                finalOffset.x = offset.x - topLeft.x;
            } else {
                finalOffset.x = offset.x;
            }

            if (isRightToLeft)
                finalOffset.x = -finalOffset.x;

            var rah = root.ActualHeight;
            if (bottomRight.y > rah) {
                finalOffset.y = -child.ActualHeight;
            } else {
                finalOffset.y = this.RenderSize.height;
            }

            popup.HorizontalOffset = finalOffset.x;
            popup.VerticalOffset = finalOffset.y;

            this._UpdatePopupMaxHeight(this.MaxDropDownHeight);
        }
        private _UpdatePopupMaxHeight(height: number) {
            var child: FrameworkElement;
            if (this.$Popup && (child = <FrameworkElement>this.$Popup.Child) && child instanceof FrameworkElement) {
                if (height === Number.POSITIVE_INFINITY) {
                    var surface = this.XamlNode.LayoutUpdater.tree.surface;
                    if (surface)
                        height = surface.height / 2.0;
                }
                child.MaxHeight = height;
            }
        }
    }
    Fayde.CoreLibrary.add(ComboBox);
    TemplateParts(ComboBox, 
        { Name: "ContentPresenter", Type: ContentPresenter },
        { Name: "Popup", Type: Primitives.Popup },
        { Name: "ContentPresenterBorder", Type: FrameworkElement },
        { Name: "DropDownToggle", Type: Primitives.ToggleButton },
        { Name: "ScrollViewer", Type: ScrollViewer });
    TemplateVisualStates(ComboBox, 
        { GroupName: "CommonStates", Name: "Normal" },
        { GroupName: "CommonStates", Name: "MouseOver" },
        { GroupName: "CommonStates", Name: "Disabled" },
        { GroupName: "FocusStates", Name: "Unfocused" },
        { GroupName: "FocusStates", Name: "Focused" },
        { GroupName: "FocusStates", Name: "FocusedDropDown" },
        { GroupName: "ValidationStates", Name: "Valid" },
        { GroupName: "ValidationStates", Name: "InvalidUnfocused" },
        { GroupName: "ValidationStates", Name: "InvalidFocused" });
}