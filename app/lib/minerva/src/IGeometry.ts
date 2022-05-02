module minerva {
    export interface IGeometry {
        Draw(ctx: core.render.RenderContext);
        GetBounds(): Rect;
    }
}
