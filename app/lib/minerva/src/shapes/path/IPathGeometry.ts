module minerva.shapes.path {
    export interface IPathGeometry {
        fillRule: FillRule;
        Draw (ctx: minerva.core.render.RenderContext);
        GetBounds(pars?: minerva.path.IStrokeParameters): Rect;
    }
}