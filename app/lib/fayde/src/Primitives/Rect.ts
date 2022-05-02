class Rect extends minerva.Rect {
    Clone (): Rect {
        return new Rect(this.x, this.y, this.width, this.height);
    }
}
Fayde.CoreLibrary.addPrimitive(Rect);

nullstone.registerTypeConverter(Rect, (val: any): any => {
    if (!val)
        return new Rect();
    if (val instanceof Rect)
        return val;

    var tokens = Fayde.splitCommaList(val.toString());
    if (tokens.length === 4) {
        return new Rect(parseFloat(tokens[0]), parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
    }
    throw new Error("Cannot parse Rect value '" + val + "'");
});
