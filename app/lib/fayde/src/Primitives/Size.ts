class Size extends minerva.Size {
    Clone (): Size {
        return new Size(this.width, this.height);
    }
}
Fayde.CoreLibrary.addPrimitive(Size);

nullstone.registerTypeConverter(Size, (val: any): Size => {
    if (!val)
        return new Size();
    if (val instanceof Size)
        return <Size>val;
    if (val instanceof minerva.Size)
        return new Size(val.width, val.height);
    var tokens = Fayde.splitCommaList(val.toString());
    if (tokens.length === 2) {
        var w = parseFloat(tokens[0]);
        var h = parseFloat(tokens[1]);
        return new Size(w, h);
    }
    throw new Exception("Cannot parse Size value '" + val + "'");
});
