/// <reference path="ContentPresenter.ts" />
/// <reference path="Primitives/IScrollInfo.ts" />

module Fayde.Controls {
    export class ScrollContentPresenter extends ContentPresenter implements Primitives.IScrollInfo {
        CreateLayoutUpdater() {
            var updater = new minerva.controls.scrollcontentpresenter.ScrollContentPresenterUpdater();
            updater.assets.scrollData = this._ScrollData = new Primitives.ScrollData();
            return updater;
        }

        private _ScrollData: Primitives.ScrollData;
        private _IsClipPropertySet: boolean = false;
        private _ClippingRectangle: Media.RectangleGeometry = null;

        get ScrollOwner(): ScrollViewer { return this._ScrollData.scrollOwner; }
        set ScrollOwner(value: ScrollViewer) { this._ScrollData.scrollOwner = value; }
        get CanHorizontallyScroll(): boolean { return this._ScrollData.canHorizontallyScroll;; }
        set CanHorizontallyScroll(value: boolean) {
            var sd = this._ScrollData;
            if (sd.canHorizontallyScroll !== value) {
                sd.canHorizontallyScroll = value;
                this.XamlNode.LayoutUpdater.invalidateMeasure();
            }
        }
        get CanVerticallyScroll(): boolean { return this._ScrollData.canVerticallyScroll; }
        set CanVerticallyScroll(value: boolean) {
            var sd = this._ScrollData;
            if (sd.canVerticallyScroll !== value) {
                sd.canVerticallyScroll = value;
                this.XamlNode.LayoutUpdater.invalidateMeasure();
            }
        }
        get ExtentWidth(): number { return this._ScrollData.extentWidth; }
        get ExtentHeight(): number { return this._ScrollData.extentHeight; }
        get ViewportWidth(): number { return this._ScrollData.viewportWidth; }
        get ViewportHeight(): number { return this._ScrollData.viewportHeight; }
        get HorizontalOffset(): number { return this._ScrollData.offsetX; }
        get VerticalOffset(): number { return this._ScrollData.offsetY; }
        LineUp(): boolean { return this.SetVerticalOffset(this._ScrollData.offsetY - 16); }
        LineDown(): boolean { return this.SetVerticalOffset(this._ScrollData.offsetY + 16); }
        LineLeft(): boolean { return this.SetHorizontalOffset(this._ScrollData.offsetX - 16); }
        LineRight(): boolean { return this.SetHorizontalOffset(this._ScrollData.offsetX + 16); }
        MouseWheelUp(): boolean { return this.SetVerticalOffset(this._ScrollData.offsetY - 48); }
        MouseWheelDown(): boolean { return this.SetVerticalOffset(this._ScrollData.offsetY + 48); }
        MouseWheelLeft(): boolean { return this.SetHorizontalOffset(this._ScrollData.offsetX - 48); }
        MouseWheelRight(): boolean { return this.SetHorizontalOffset(this._ScrollData.offsetX + 48); }
        PageUp(): boolean { return this.SetVerticalOffset(this._ScrollData.offsetY - this._ScrollData.viewportHeight); }
        PageDown(): boolean { return this.SetVerticalOffset(this._ScrollData.offsetY + this._ScrollData.viewportHeight); }
        PageLeft(): boolean { return this.SetHorizontalOffset(this._ScrollData.offsetX - this._ScrollData.viewportWidth); }
        PageRight(): boolean { return this.SetHorizontalOffset(this._ScrollData.offsetX + this._ScrollData.viewportWidth); }
        MakeVisible(uie: UIElement, viewport: minerva.Rect): minerva.Rect {
            var vis = new minerva.Rect();
            if (minerva.Rect.isEmpty(viewport) || !uie || uie === this || !this.XamlNode.IsAncestorOf(uie.XamlNode))
                return vis;

            var generalTransform = uie.TransformToVisual(this);
            var xpoint = generalTransform.Transform(viewport);
            minerva.Size.copyTo(viewport, vis);
            minerva.Point.copyTo(xpoint, vis);
            return vis;

            //TODO: Not sure why this was skipped
            /*
            var irect = new minerva.Rect();
            minerva.Rect.set(irect, this.HorizontalOffset, this.VerticalOffset, this.ViewportWidth, this.ViewportHeight);
            viewport.X += irect.X;
            viewport.Y += irect.Y;
            var num = computeScrollOffsetWithMinimalScroll(irect.X, irect.X + irect.Width, viewport.X, viewport.X + viewport.Width);
            var num1 = computeScrollOffsetWithMinimalScroll(irect.Y, irect.Y + irect.Height, viewport.Y, viewport.Y + viewport.Height);
            this.SetHorizontalOffset(num);
            this.SetVerticalOffset(num1);
            irect.X = num;
            irect.Y = num1;
            minerva.Rect.intersection(viewport, irect);
            if (!minerva.Rect.isEmpty(viewport)) {
                viewport.X -= irect.X;
                viewport.Y -= irect.Y;
            }
            return viewport;
            */
        }
        SetHorizontalOffset(offset: number): boolean {
            if (isNaN(offset))
                throw new ArgumentException("Offset is not a number.");
            var sd = this._ScrollData;
            if (!sd.canHorizontallyScroll)
                return false;
            offset = Math.max(0, Math.min(offset, sd.extentWidth - sd.viewportWidth));
            if (NumberEx.AreClose(this._ScrollData.offsetX, offset))
                return false;

            sd.cachedOffsetX = offset;
            this.XamlNode.LayoutUpdater.invalidateArrange();
            return true;
        }
        SetVerticalOffset(offset: number): boolean {
            if (isNaN(offset))
                throw new ArgumentException("Offset is not a number.");
            var sd = this._ScrollData;
            if (!sd.canVerticallyScroll)
                return false;
            offset = Math.max(0, Math.min(offset, sd.extentHeight - sd.viewportHeight));
            if (NumberEx.AreClose(this._ScrollData.offsetY, offset))
                return false;

            sd.cachedOffsetY = offset;
            this.XamlNode.LayoutUpdater.invalidateArrange();
            return true;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();

            var sv: ScrollViewer;
            if (this.TemplateOwner instanceof ScrollViewer)
                sv = <ScrollViewer>this.TemplateOwner;
            else
                return;

            var content = this.Content;
            var info = Primitives.IScrollInfo_.as(content);
            if (!info && content instanceof ItemsPresenter) {
                var ip = <ItemsPresenter>content;
                var err = new BError();
                ip.XamlNode.ApplyTemplateWithError(err);
                if (err.Message)
                    err.ThrowException();
                info = Primitives.IScrollInfo_.as(ip.Panel);
            }

            if (!info)
                info = this;

            info.CanHorizontallyScroll = sv.HorizontalScrollBarVisibility !== ScrollBarVisibility.Disabled;
            info.CanVerticallyScroll = sv.VerticalScrollBarVisibility !== ScrollBarVisibility.Disabled;
            info.ScrollOwner = sv;
            sv.ScrollInfo = info;
            sv.InvalidateScrollInfo();
        }

    }
    Fayde.CoreLibrary.add(ScrollContentPresenter);
    nullstone.addTypeInterfaces(ScrollContentPresenter, Primitives.IScrollInfo_);

    function computeScrollOffsetWithMinimalScroll(topView, bottomView, topChild, bottomChild) {
        var flag = NumberEx.IsLessThanClose(topChild, topView) && NumberEx.IsLessThanClose(bottomChild, bottomView);
        var flag1 = NumberEx.IsGreaterThanClose(topChild, topView) && NumberEx.IsGreaterThanClose(bottomChild, bottomView);

        var flag4 = (bottomChild - topChild) > (bottomView - topView);
        if ((!flag || flag4) && (!flag1 || !flag4)) {
            if (flag || flag1)
                return bottomChild - bottomView - topView;
            return topView;
        }
        return topChild;
    }
}