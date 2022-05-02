module minerva {
    export function getNaturalCanvasSize(canvas: HTMLCanvasElement): Size {
        var zoomFactor = minerva.zoom.calc();
        return new Size(canvas.offsetWidth * zoomFactor, canvas.offsetHeight * zoomFactor);
    }
}