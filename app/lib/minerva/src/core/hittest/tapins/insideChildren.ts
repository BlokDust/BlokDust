module minerva.core.hittest.tapins {
    export function insideChildren (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean {
        hitList.unshift(data.updater);

        var hit = false;
        for (var walker = data.tree.walk(WalkDirection.ZReverse); walker.step();) {
            hit = walker.current.hitTest(pos, hitList, ctx, includeAll) || hit;
            if (hit && !includeAll)
                break;
        }
        data.hitChildren = hit;

        return true;
    }
}