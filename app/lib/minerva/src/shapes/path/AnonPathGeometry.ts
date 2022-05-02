module minerva.shapes.path {
    export class AnonPathGeometry implements IPathGeometry {
        old: boolean = true;
        path = new minerva.path.Path();
        fillRule = FillRule.EvenOdd;

        Draw (ctx: minerva.core.render.RenderContext) {
            this.path.draw(ctx.raw);
        }

        GetBounds (pars?: minerva.path.IStrokeParameters): Rect {
            return this.path.calcBounds(pars);
        }
    }
}