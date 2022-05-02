module minerva.controls.grid.measure {
    export class GridShape {
        hasAutoAuto: boolean = false;
        hasStarAuto: boolean = false;
        hasAutoStar: boolean = false;

        init (childShapes: GridChildShape[]) {
            this.hasAutoAuto = this.hasStarAuto = this.hasAutoStar = false;
            for (var i = 0; i < childShapes.length; i++) {
                var cs = childShapes[i];
                this.hasAutoAuto = this.hasAutoAuto || (cs.autoRow && cs.autoCol && !cs.starRow && !cs.starCol);
                this.hasStarAuto = this.hasStarAuto || (cs.starRow && cs.autoCol);
                this.hasAutoStar = this.hasAutoStar || (cs.autoRow && cs.starCol);
            }
        }
    }
}