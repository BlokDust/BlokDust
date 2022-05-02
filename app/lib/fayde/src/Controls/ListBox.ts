/// <reference path="Primitives/Selector.ts" />
/// <reference path="ScrollViewer.ts" />

module Fayde.Controls {
    interface IOutValue {
        Value: any;
    }
    export class ListBox extends Primitives.Selector {
        private _FocusedIndex: number = 0;
        static ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", () => Style, ListBox, undefined, (d, args) => (<ListBox>d).OnItemContainerStyleChanged(args));
        static IsSelectionActiveProperty = Primitives.Selector.IsSelectionActiveProperty;
        ItemContainerStyle: Style;

        constructor () {
            super();
            this.DefaultStyleKey = ListBox;
        }

        ScrollIntoView(item: any) {
            var tsv = this.$TemplateScrollViewer;
            if (!tsv)
                return;
            var items = this.Items;
            if (!items.Contains(item))
                return;

            var ihro = { Value: null };
            var lbiro = { Value: null };
            var virtualizing = VirtualizingStackPanel.GetIsVirtualizing(this);
            if (this._IsOnCurrentPage(item, ihro, lbiro))
                return;
            var ihr = ihro.Value;
            var lbir = lbiro.Value;

            if (this._GetIsVerticalOrientation()) {
                if (virtualizing) {
                    tsv.ScrollToVerticalOffset(this.SelectedIndex);
                    return;
                }
                var verticalOffset = tsv.VerticalOffset;
                var verticalDelta = 0;
                if (ihr.GetBottom() < lbir.GetBottom()) {
                    verticalDelta = lbir.GetBottom() - ihr.GetBottom();
                    verticalOffset += verticalDelta;
                }
                if ((lbir.Y - verticalDelta) < ihr.Y) {
                    verticalOffset -= ihr.Y - (lbir.Y - verticalDelta);
                }
                tsv.ScrollToVerticalOffset(verticalOffset);
            } else {
                if (virtualizing) {
                    tsv.ScrollToHorizontalOffset(this.SelectedIndex);
                    return;
                }
                var horizontalOffset = tsv.HorizontalOffset;
                var horizontalDelta = 0;
                if (ihr.GetRight() < lbir.GetRight()) {
                    horizontalDelta = lbir.GetRight() - ihr.GetRight();
                    horizontalOffset += horizontalDelta;
                }
                if ((ihr.X - horizontalDelta) < ihr.X) {
                    horizontalOffset -= ihr.X - (lbir.X - horizontalDelta);
                }
                tsv.ScrollToHorizontalOffset(horizontalOffset);
            }
        }

        private _NavigateByPage(forward: boolean) {
            var tsv = this.$TemplateScrollViewer;
            var newFocusedIndex = -1;
            var item = (this._FocusedIndex !== -1) ? this.Items.GetValueAt(this._FocusedIndex) : null;
            if (item != null && !this._IsOnCurrentPage(item)) {
                this.ScrollIntoView(item);
                if (tsv != null)
                    tsv.UpdateLayout();
            }
            if (item == null) {
                newFocusedIndex = this._GetFirstItemOnCurrentPage(this._FocusedIndex, forward);
            } else {
                var firstItemOnCurrentPage = this._GetFirstItemOnCurrentPage(this._FocusedIndex, forward);
                if (firstItemOnCurrentPage !== this._FocusedIndex) {
                    newFocusedIndex = firstItemOnCurrentPage;
                } else {
                    if (tsv != null) {
                        if (this._GetIsVerticalOrientation()) {
                            tsv.ScrollToVerticalOffset(Math.max(0, Math.min(tsv.ScrollableHeight,
                                tsv.VerticalOffset + (tsv.ViewportHeight * (forward ? 1 : -1)))));
                        } else {
                            tsv.ScrollToHorizontalOffset(Math.max(0, Math.min(tsv.ScrollableWidth,
                                tsv.HorizontalOffset + (tsv.ViewportWidth * (forward ? 1 : -1)))));

                        }
                        tsv.UpdateLayout();
                    }
                    newFocusedIndex = this._GetFirstItemOnCurrentPage(this._FocusedIndex, forward);
                }
            }
            return newFocusedIndex;
        }
        private _ScrollInDirection(key: Input.Key) {
            if (this.$TemplateScrollViewer)
                this.$TemplateScrollViewer.ScrollInDirection(key);
        }
        private _IsOnCurrentPage(item: any, itemsHostRectOut?: IOutValue, listBoxItemsRectOut?: IOutValue) {
            if (!itemsHostRectOut) itemsHostRectOut = { Value: null };
            if (!listBoxItemsRectOut) listBoxItemsRectOut = { Value: null };

            var itemsHost: UIElement = <UIElement>VisualTreeHelper.GetChild(VisualTreeHelper.GetChild(this, 0), 0);

            var tsv = this.$TemplateScrollViewer;
            if (tsv != null) {
                itemsHost = tsv;
                if (tsv.$ScrollContentPresenter != null)
                    itemsHost = tsv.$ScrollContentPresenter;
            }
            if (!(itemsHost instanceof FrameworkElement))
                itemsHost = null;

            var ihro = itemsHostRectOut.Value = new minerva.Rect();
            var lbiro = listBoxItemsRectOut.Value = new minerva.Rect();
            if (!itemsHost)
                return false;
            minerva.Size.copyTo(itemsHost.RenderSize, ihro);

            var lbi = <ListBoxItem>this.ItemContainersManager.ContainerFromItem(item);
            if (!lbi)
                return false;

            minerva.Size.copyTo(lbi.RenderSize, lbiro);

            if (itemsHost instanceof Control) {
                var padding = (<Control>itemsHost).Padding;
                if (padding) {
                    ihro.x = ihro.x + padding.left;
                    ihro.y = ihro.y + padding.top;
                    ihro.width = ihro.width - padding.left - padding.right;
                    ihro.height = ihro.height - padding.top - padding.bottom;
                }
            }

            var genXform = lbi.TransformToVisual(itemsHost);
            if (genXform != null) {
                var ptl = genXform.Transform(new Point());
                var pbr = genXform.Transform(new Point(lbi.RenderSize.width, lbi.RenderSize.height));
                lbiro.x = Math.min(ptl.x, pbr.x);
                lbiro.y = Math.min(ptl.y, pbr.y);
                lbiro.width = Math.abs(ptl.x - pbr.x);
                lbiro.height = Math.abs(ptl.y - pbr.y);
            }

            return this._GetIsVerticalOrientation()
                ? ihro.y <= lbiro.y && minerva.Rect.getBottom(ihro) >= minerva.Rect.getBottom(lbiro)
                : ihro.x <= lbiro.x && minerva.Rect.getRight(ihro) >= minerva.Rect.getRight(lbiro);
        }
        private _GetFirstItemOnCurrentPage(startingIndex: number, forward: boolean): number {
            var delta = forward ? 1 : -1;
            var fiocp = -1;
            var probeIndex = startingIndex;
            var items = this.Items;
            var itemsCount = items.Count;
            while (probeIndex >= 0 && probeIndex < itemsCount && !this._IsOnCurrentPage(items.GetValueAt(probeIndex))) {
                fiocp = probeIndex;
                probeIndex += delta;
            }
            while (probeIndex >= 0 && probeIndex < itemsCount && this._IsOnCurrentPage(items.GetValueAt(probeIndex))) {
                fiocp = probeIndex;
                probeIndex += delta;
            }
            return fiocp;
        }

        OnItemContainerStyleChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldStyle = <Style>args.OldValue;
            var newStyle = <Style>args.NewValue;
            var enumerator = this.ItemContainersManager.GetEnumerator();
            while (enumerator.moveNext()) {
                var lbi = <ListBoxItem>enumerator.current;
                if (lbi instanceof ListBoxItem && lbi.Style === oldStyle)
                    lbi.Style = newStyle;
            }
        }

        OnKeyDown(args: Input.KeyEventArgs) {
            if (args.Handled)
                return;

            var newFocusedIndex = -1;
            switch (args.Key) {
                case Input.Key.Space:
                case Input.Key.Enter:
                    if (Input.Key.Enter !== args.Key || Input.KeyboardNavigation.GetAcceptsReturn(this)) {
                        if (!Input.Keyboard.HasAlt()) {
                            var focusedEl = Surface.GetFocusedElement(this);
                            var lbi: ListBoxItem;
                            if (focusedEl instanceof ListBoxItem) lbi = <ListBoxItem>focusedEl;
                            if (lbi) {
                                if (Input.Keyboard.HasControl() && lbi.IsSelected) {
                                    this.SelectedItem = null;
                                } else {
                                    this.SelectedItem = this.ItemContainersManager.ItemFromContainer(lbi);
                                }
                                args.Handled = true;
                            }
                        }
                    }
                    break;
                case Input.Key.Home:
                    newFocusedIndex = 0;
                    break;
                case Input.Key.End:
                    newFocusedIndex = this.Items.Count - 1;
                    break;
                case Input.Key.PageUp:
                    newFocusedIndex = this._NavigateByPage(false);
                    break;
                case Input.Key.PageDown:
                    newFocusedIndex = this._NavigateByPage(true);
                    break;
                case Input.Key.Left:
                    if (this._GetIsVerticalOrientation()) {
                        this._ScrollInDirection(Input.Key.Left);
                    } else {
                        newFocusedIndex = this._FocusedIndex - 1;
                    }
                    break;
                case Input.Key.Up:
                    if (this._GetIsVerticalOrientation()) {
                        newFocusedIndex = this._FocusedIndex - 1;
                    } else {
                        this._ScrollInDirection(Input.Key.Up);
                    }
                    break;
                case Input.Key.Right:
                    if (this._GetIsVerticalOrientation()) {
                        this._ScrollInDirection(Input.Key.Right);
                    } else {
                        newFocusedIndex = this._FocusedIndex + 1;
                    }
                    break;
                case Input.Key.Down:
                    if (this._GetIsVerticalOrientation()) {
                        newFocusedIndex = this._FocusedIndex + 1;
                    } else {
                        this._ScrollInDirection(Input.Key.Down);
                    }
                    break;
            }

            if (newFocusedIndex !== -1 && this._FocusedIndex !== -1 && newFocusedIndex !== this._FocusedIndex && newFocusedIndex >= 0 && newFocusedIndex < this.Items.Count) {
                // A key press changes the focused ListBoxItem
                var icm = this.ItemContainersManager;
                var lbi = <ListBoxItem>icm.ContainerFromIndex(newFocusedIndex);
                var item = icm.ItemFromContainer(lbi);
                this.ScrollIntoView(item);
                if (Fayde.Input.Keyboard.HasControl()) {
                    lbi.Focus();
                } else {
                    this.SelectedItem = item;
                }
                args.Handled = true;
            }
        }
        private _GetIsVerticalOrientation(): boolean {
            var presenter = this.XamlNode.ItemsPresenter;
            if (!presenter)
                return true;
            var p = presenter.Panel;
            if (p instanceof StackPanel)
                return (<StackPanel>p).Orientation === Orientation.Vertical;
            if (p instanceof VirtualizingStackPanel)
                return (<VirtualizingStackPanel>p).Orientation === Orientation.Vertical;
            return true;
        }

        IsItemItsOwnContainer(item: any): boolean {
            return item instanceof ListBoxItem;
        }
        GetContainerForItem(): UIElement {
            var item = new ListBoxItem();
            var ics = this.ItemContainerStyle;
            if (ics != null)
                item.Style = ics;
            return item;
        }
        PrepareContainerForItem(element: UIElement, item: any) {
            super.PrepareContainerForItem(element, item);
            var ics = this.ItemContainerStyle;
            var lbi = <ListBoxItem>element;
            if (!lbi.Style && ics)
                lbi.Style = ics;
        }

        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.SetValueInternal(ListBox.IsSelectionActiveProperty, true);
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.SetValueInternal(ListBox.IsSelectionActiveProperty, false);
        }

        NotifyListItemGotFocus(lbi: ListBoxItem) {
            this._FocusedIndex = this.ItemContainersManager.IndexFromContainer(lbi);
        }
        NotifyListItemLostFocus(lbi: ListBoxItem) {
            this._FocusedIndex = -1;
        }
    }
    Fayde.CoreLibrary.add(ListBox);
    TemplateVisualStates(ListBox,
        { GroupName: "ValidationStates", Name: "Valid" },
        { GroupName: "ValidationStates", Name: "InvalidUnfocused" },
        { GroupName: "ValidationStates", Name: "InvalidFocused" });
    TemplateParts(ListBox,
        { Name: "ScrollViewer", Type: ScrollViewer });
}