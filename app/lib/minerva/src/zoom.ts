module minerva.zoom {
    export var calc: () => number = (() => {
        if ((<any>document).frames) //IE 7-9
            return ie();
        return chrome();
    })();

    function ie() {
        return () => {
            var screen = (<any>document).frames.screen;
            var zoom = screen.deviceXDPI / screen.systemXDPI;
            return Math.round(zoom * 100) / 100;
        };
    }

    function chrome() {
        var svg: SVGSVGElement;

        function memoizeSvg() {
            if (!!svg || !document.body)
                return;
            svg = <SVGSVGElement>document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('version', '1.1');
            document.body.appendChild(svg);
            ((style: CSSStyleDeclaration) => {
                style.opacity = "0.0";
                style.position = "absolute";
                style.left = "-300px";
                //style.top = "-150px";
            })(<any>svg.style);
        }

        return () => {
            memoizeSvg();
            return !svg ? 1 : svg.currentScale;
        };
    }
}
