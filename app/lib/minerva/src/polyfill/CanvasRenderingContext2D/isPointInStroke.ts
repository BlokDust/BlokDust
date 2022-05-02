interface CanvasRenderingContext2D {
    isPointInStroke(x: number, y: number): boolean;
}
if (!CanvasRenderingContext2D.prototype.isPointInStroke) {
    CanvasRenderingContext2D.prototype.isPointInStroke = function (x: number, y: number) {
        return false;
    };
}