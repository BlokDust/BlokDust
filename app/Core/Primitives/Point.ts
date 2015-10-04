export class Point extends minerva.Point {
    Clone (): Point {
        return new Point(this.x, this.y);
    }

    static LERP (start: Point, end: Point, p: number): Point {
        var x = start.x + (end.x - start.x) * p;
        var y = start.y + (end.y - start.y) * p;
        return new Point(x, y);
    }
}