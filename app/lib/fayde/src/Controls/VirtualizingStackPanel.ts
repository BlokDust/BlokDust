/// <reference path="VirtualizingPanel.ts" />

module Fayde.Controls {
    var LineDelta = 14.7;
    var Wheelitude = 3;

    import VirtualizingStackPanelUpdater = minerva.controls.virtualizingstackpanel.VirtualizingStackPanelUpdater;

    export class VirtualizingStackPanel extends VirtualizingPanel implements Primitives.IScrollInfo {
        CreateLayoutUpdater() {
            var updater = new VirtualizingStackPanelUpdater();
            updater.assets.scrollData = this._ScrollData = new Primitives.ScrollData();
            updater.tree.containerOwner = new Internal.VirtualizingPanelContainerOwner(this);
            return updater;
        }

        private _ScrollData: Primitives.ScrollData;

        get ScrollOwner(): ScrollViewer {
            return this._ScrollData.scrollOwner;
        }

        set ScrollOwner(value: ScrollViewer) {
            this._ScrollData.scrollOwner = value;
        }

        get CanHorizontallyScroll(): boolean {
            return this._ScrollData.canHorizontallyScroll;
            ;
        }

        set CanHorizontallyScroll(value: boolean) {
            var sd = this._ScrollData;
            if (sd.canHorizontallyScroll !== value) {
                sd.canHorizontallyScroll = value;
                this.XamlNode.LayoutUpdater.invalidateMeasure();
            }
        }

        get CanVerticallyScroll(): boolean {
            return this._ScrollData.canVerticallyScroll;
        }

        set CanVerticallyScroll(value: boolean) {
            var sd = this._ScrollData;
            if (sd.canVerticallyScroll !== value) {
                sd.canVerticallyScroll = value;
                this.XamlNode.LayoutUpdater.invalidateMeasure();
            }
        }

        get ExtentWidth(): number {
            return this._ScrollData.extentWidth;
        }

        get ExtentHeight(): number {
            return this._ScrollData.extentHeight;
        }

        get ViewportWidth(): number {
            return this._ScrollData.viewportWidth;
        }

        get ViewportHeight(): number {
            return this._ScrollData.viewportHeight;
        }

        get HorizontalOffset(): number {
            return this._ScrollData.offsetX;
        }

        get VerticalOffset(): number {
            return this._ScrollData.offsetY;
        }

        LineUp(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Horizontal)
                return this.SetVerticalOffset(sd.offsetY - LineDelta);
            return this.SetVerticalOffset(sd.offsetY - 1);
        }

        LineDown(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Horizontal)
                return this.SetVerticalOffset(sd.offsetY + LineDelta);
            return this.SetVerticalOffset(sd.offsetY + 1);
        }

        LineLeft(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Vertical)
                return this.SetHorizontalOffset(sd.offsetX - LineDelta);
            return this.SetHorizontalOffset(sd.offsetX - 1);
        }

        LineRight(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Vertical)
                return this.SetHorizontalOffset(sd.offsetX + LineDelta);
            return this.SetHorizontalOffset(sd.offsetX + 1);
        }

        MouseWheelUp(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Horizontal)
                return this.SetVerticalOffset(sd.offsetY - LineDelta * Wheelitude);
            return this.SetVerticalOffset(sd.offsetY - Wheelitude);
        }

        MouseWheelDown(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Horizontal)
                return this.SetVerticalOffset(sd.offsetY + LineDelta * Wheelitude);
            return this.SetVerticalOffset(sd.offsetY + Wheelitude);
        }

        MouseWheelLeft(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Vertical)
                return this.SetHorizontalOffset(sd.offsetX - LineDelta * Wheelitude);
            return this.SetHorizontalOffset(sd.offsetX - Wheelitude);
        }

        MouseWheelRight(): boolean {
            var sd = this._ScrollData;
            if (this.Orientation === Fayde.Orientation.Vertical)
                return this.SetHorizontalOffset(sd.offsetX + LineDelta * Wheelitude);
            return this.SetHorizontalOffset(sd.offsetX + Wheelitude);
        }

        PageUp(): boolean {
            var sd = this._ScrollData;
            return this.SetVerticalOffset(sd.offsetY - sd.viewportHeight);
        }

        PageDown(): boolean {
            var sd = this._ScrollData;
            return this.SetVerticalOffset(sd.offsetY + sd.viewportHeight);
        }

        PageLeft(): boolean {
            var sd = this._ScrollData;
            return this.SetHorizontalOffset(sd.offsetX - sd.viewportWidth);
        }

        PageRight(): boolean {
            var sd = this._ScrollData;
            return this.SetHorizontalOffset(sd.offsetX + sd.viewportWidth);
        }

        MakeVisible(uie: UIElement, rectangle: minerva.Rect): minerva.Rect {
            var exposed = new minerva.Rect();
            var sd = this._ScrollData;

            var uin = uie.XamlNode;
            var isVertical = this.Orientation === Orientation.Vertical;
            var enumerator = this.Children.getEnumerator();
            while (enumerator.moveNext()) {
                var child = enumerator.current;
                var childNode = child.XamlNode;
                var childRenderSize = childNode.LayoutUpdater.assets.renderSize;
                if (uin === childNode) {
                    if (isVertical) {
                        if (rectangle.x !== sd.offsetX)
                            this.SetHorizontalOffset(rectangle.x);

                        exposed.width = Math.min(childRenderSize.width, sd.viewportWidth);
                        exposed.height = childRenderSize.height;
                        exposed.x = sd.offsetX;
                    } else {
                        if (rectangle.y !== sd.offsetY)
                            this.SetVerticalOffset(rectangle.y);

                        exposed.height = Math.min(childRenderSize.height, sd.viewportHeight);
                        exposed.width = childRenderSize.width;
                        exposed.y = sd.offsetY;
                    }
                    return exposed;
                }

                if (isVertical)
                    exposed.y += childRenderSize.height;
                else
                    exposed.x += childRenderSize.width;
            }

            throw new ArgumentException("Visual is not a child of this Panel");
        }

        SetHorizontalOffset(offset: number): boolean {
            var sd = this._ScrollData;
            if (offset < 0 || sd.viewportWidth >= sd.extentWidth)
                offset = 0;
            else if ((offset + sd.viewportWidth) >= sd.extentWidth)
                offset = sd.extentWidth - sd.viewportWidth;

            if (sd.offsetX === offset)
                return false;
            sd.offsetX = offset;

            if (this.Orientation === Fayde.Orientation.Horizontal)
                this.XamlNode.LayoutUpdater.invalidateMeasure();
            else
                this.XamlNode.LayoutUpdater.invalidateArrange();

            var scrollOwner = this.ScrollOwner;
            if (scrollOwner)
                scrollOwner.InvalidateScrollInfo();
            return true;
        }

        SetVerticalOffset(offset: number): boolean {
            var sd = this._ScrollData;
            if (offset < 0 || sd.viewportHeight >= sd.extentHeight)
                offset = 0;
            else if ((offset + sd.viewportHeight) >= sd.extentHeight)
                offset = sd.extentHeight - sd.viewportHeight;

            if (sd.offsetY === offset)
                return false;
            sd.offsetY = offset;

            if (this.Orientation === Fayde.Orientation.Vertical)
                this.XamlNode.LayoutUpdater.invalidateMeasure();
            else
                this.XamlNode.LayoutUpdater.invalidateArrange();

            var scrollOwner = this.ScrollOwner;
            if (scrollOwner)
                scrollOwner.InvalidateScrollInfo();
            return true;
        }

        static OrientationProperty = DependencyProperty.Register("Orientation", () => new Enum(Orientation), VirtualizingStackPanel, Orientation.Vertical);
        Orientation: Orientation;

        OnItemsAdded(index: number, newItems: any[]) {
            super.OnItemsAdded(index, newItems);

            var isHorizontal = this.Orientation === Orientation.Horizontal;
            var offset = isHorizontal ? this.HorizontalOffset : this.VerticalOffset;
            if (index <= offset)
                isHorizontal ? this.SetHorizontalOffset(offset + newItems.length) : this.SetVerticalOffset(offset + newItems.length);

            var scrollOwner = this.ScrollOwner;
            if (scrollOwner)
                scrollOwner.InvalidateScrollInfo();
        }

        OnItemsRemoved(index: number, oldItems: any[]) {
            super.OnItemsRemoved(index, oldItems);

            var ic = this.ItemsControl;
            if (ic) {
                var icm = ic.ItemContainersManager;
                var children = this.Children;
                for (var i = 0, len = oldItems.length; i < len; i++) {
                    var oldItem = oldItems[i];
                    var container = icm.ContainerFromItem(oldItem);
                    if (container)
                        children.Remove(container);
                }
            }

            var isHorizontal = this.Orientation === Orientation.Horizontal;
            var offset = isHorizontal ? this.HorizontalOffset : this.VerticalOffset;

            var numBeforeOffset = Math.min(offset, index + oldItems.length) - index;
            if (numBeforeOffset > 0)
                isHorizontal ? this.SetHorizontalOffset(numBeforeOffset) : this.SetVerticalOffset(numBeforeOffset);

            var scrollOwner = this.ScrollOwner;
            if (scrollOwner)
                scrollOwner.InvalidateScrollInfo();
        }
    }
    Fayde.CoreLibrary.add(VirtualizingStackPanel);
    nullstone.addTypeInterfaces(VirtualizingStackPanel, Primitives.IScrollInfo_);

    module reactions {
        UIReaction<minerva.Orientation>(VirtualizingStackPanel.OrientationProperty, (upd, ov, nv) => upd.invalidateMeasure(), false);
    }
}