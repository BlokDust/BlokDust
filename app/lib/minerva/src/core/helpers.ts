module minerva.core.helpers {
    export interface ISized {
        width: number;
        height: number;
        minWidth: number;
        minHeight: number;
        maxWidth: number;
        maxHeight: number;
        useLayoutRounding: boolean;
    }
    export function coerceSize (size: ISize, assets: ISized) {
        var cw = Math.max(assets.minWidth, size.width);
        var ch = Math.max(assets.minHeight, size.height);

        if (!isNaN(assets.width))
            cw = assets.width;

        if (!isNaN(assets.height))
            ch = assets.height;

        cw = Math.max(Math.min(cw, assets.maxWidth), assets.minWidth);
        ch = Math.max(Math.min(ch, assets.maxHeight), assets.minHeight);

        if (assets.useLayoutRounding) {
            cw = Math.round(cw);
            ch = Math.round(ch);
        }

        size.width = cw;
        size.height = ch;
    }

    export function intersectBoundsWithClipPath (dest: Rect, src: Rect, thickness: Thickness, xform: number[], clip: IGeometry, layoutClip: Rect) {
        Rect.copyTo(src, dest);
        Thickness.growRect(thickness, dest);

        if (clip)
            Rect.intersection(dest, clip.GetBounds());
        if (!Rect.isEmpty(layoutClip))
            Rect.intersection(dest, layoutClip);

        if (xform)
            Rect.transform(dest, xform);
    }

    export interface IClipAssets {
        layoutClip: Rect;
        breakLayoutClip: boolean;
        visualOffset: Point;
    }
    var offset = new Point();

    export function renderLayoutClip (ctx: render.RenderContext, assets: IClipAssets, tree: core.IUpdaterTree) {
        var lc: Rect;
        offset.x = 0;
        offset.y = 0;

        var raw = ctx.raw;
        var cur: Updater;
        while (assets) {
            lc = assets.layoutClip;
            if (!Rect.isEmpty(lc)) {
                raw.beginPath();
                raw.rect(lc.x, lc.y, lc.width, lc.height);
                raw.clip();
            }

            if (assets.breakLayoutClip)
                break;

            var vo = assets.visualOffset;
            offset.x += vo.x;
            offset.y += vo.y;
            ctx.translate(-vo.x, -vo.y);

            if (!tree)
                break;
            cur = tree.visualParent;
            tree = cur ? cur.tree : null;
            assets = <any>(cur ? cur.assets : null);
        }
        ctx.translate(offset.x, offset.y);
    }
}