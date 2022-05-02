class Thickness extends minerva.Thickness {
    Clone (): Thickness {
        return new Thickness(this.left, this.top, this.right, this.bottom);
    }

    toString () {
        var l = this.left || 0;
        var t = this.top || 0;
        var r = this.right || 0;
        var b = this.bottom || 0;
        return [l, t, r, b].join(',');
    }
}
Fayde.CoreLibrary.addPrimitive(Thickness);

nullstone.registerTypeConverter(Thickness, (val: any): Thickness => {
    if (!val)
        return new Thickness();
    if (typeof val === "number")
        return new Thickness(val, val, val, val);
    if (val instanceof Thickness) {
        var t = <Thickness>val;
        return new Thickness(t.left, t.top, t.right, t.bottom);
    }
    var tokens = Fayde.splitCommaList(val.toString());
    var left, top, right, bottom;
    if (tokens.length === 1) {
        left = top = right = bottom = parseFloat(tokens[0]);
    } else if (tokens.length === 2) {
        left = right = parseFloat(tokens[0]);
        top = bottom = parseFloat(tokens[1]);
    } else if (tokens.length === 4) {
        left = parseFloat(tokens[0]);
        top = parseFloat(tokens[1]);
        right = parseFloat(tokens[2]);
        bottom = parseFloat(tokens[3]);
    } else {
        throw new Exception("Cannot parse Thickness value '" + val + "'");
    }
    return new Thickness(left, top, right, bottom);
});
