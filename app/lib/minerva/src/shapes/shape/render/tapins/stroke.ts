module minerva.shapes.shape.render.tapins {
    var caps: string[] = [
        "butt", //flat
        "square", //square
        "round", //round
        "butt" //triangle
    ];
    var joins: string[] = [
        "miter",
        "bevel",
        "round"
    ];

    export function stroke (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean {
        if (!state.shouldDraw)
            return true;

        var stroke = input.stroke;
        if (!stroke || !(input.strokeThickness > 0))
            return true;

        var raw = ctx.raw;
        raw.lineWidth = input.strokeThickness;
        raw.lineCap = caps[input.strokeStartLineCap || input.strokeEndLineCap || 0] || caps[0];
        raw.lineJoin = joins[input.strokeLineJoin || 0] || joins[0];
        raw.miterLimit = input.strokeMiterLimit;

        stroke.setupBrush(raw, input.shapeRect);
        raw.strokeStyle = stroke.toHtml5Object();
        raw.stroke();

        return true;
    }
}