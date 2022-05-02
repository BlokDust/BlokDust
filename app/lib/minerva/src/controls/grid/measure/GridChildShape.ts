module minerva.controls.grid.measure {
    export enum OverridePass {
        AutoAuto, //Child in auto row, auto col
        StarAuto, //Child in star row, auto col
        AutoStar, //Child in auto row, star col
        StarAutoAgain, //star row, auto col repeated
        NonStar, //Child in auto/pixel row, auto/pixel col
        RemainingStar //Child in ?
    }

    export class GridChildShape {
        starRow: boolean;
        autoRow: boolean;
        starCol: boolean;
        autoCol: boolean;

        col: number;
        row: number;
        colspan: number;
        rowspan: number;

        init (child: core.Updater, rm: Segment[][], cm: Segment[][]): GridChildShape {
            var col = this.col = Math.min(child.getAttachedValue("Grid.Column"), cm.length - 1);
            if (isNaN(col))
                this.col = col = 0;
            var row = this.row = Math.min(child.getAttachedValue("Grid.Row"), rm.length - 1);
            if (isNaN(row))
                this.row = row = 0;
            var colspan = this.colspan = Math.min(child.getAttachedValue("Grid.ColumnSpan"), cm.length - col);
            if (isNaN(colspan))
                this.colspan = colspan = 1;
            var rowspan = this.rowspan = Math.min(child.getAttachedValue("Grid.RowSpan"), rm.length - row);
            if (isNaN(rowspan))
                this.rowspan = rowspan = 1;

            this.starRow = this.autoRow = this.starCol = this.autoCol = false;

            for (var i = row; i < row + rowspan; i++) {
                this.starRow = this.starRow || (rm[i][i].type === GridUnitType.Star);
                this.autoRow = this.autoRow || (rm[i][i].type === GridUnitType.Auto);
            }
            for (var i = col; i < col + colspan; i++) {
                this.starCol = this.starCol || (cm[i][i].type === GridUnitType.Star);
                this.autoCol = this.autoCol || (cm[i][i].type === GridUnitType.Auto);
            }

            return this;
        }

        shouldMeasurePass (gridShape: GridShape, childSize: Size, pass: OverridePass): boolean {
            childSize.width = childSize.height = 0;

            if (this.autoRow && this.autoCol && !this.starRow && !this.starCol) {
                if (pass !== OverridePass.AutoAuto)
                    return false;
                childSize.width = Number.POSITIVE_INFINITY;
                childSize.height = Number.POSITIVE_INFINITY;
                return true;
            }

            if (this.starRow && this.autoCol && !this.starCol) {
                if (pass !== OverridePass.StarAuto && pass !== OverridePass.StarAutoAgain)
                    return false;
                if (pass === OverridePass.AutoAuto && gridShape.hasAutoStar)
                    childSize.height = Number.POSITIVE_INFINITY;
                childSize.width = Number.POSITIVE_INFINITY;
                return true;
            }

            if (this.autoRow && this.starCol && !this.starRow) {
                if (pass !== OverridePass.AutoStar)
                    return false;
                childSize.height = Number.POSITIVE_INFINITY;
                return true;
            }

            if ((this.autoRow || this.autoCol) && !(this.starRow || this.starCol)) {
                if (pass !== OverridePass.NonStar)
                    return false;
                if (this.autoRow)
                    childSize.height = Number.POSITIVE_INFINITY;
                if (this.autoCol)
                    childSize.width = Number.POSITIVE_INFINITY;
                return true;
            }

            if (!(this.starRow || this.starCol))
                return pass === OverridePass.NonStar;

            return pass === OverridePass.RemainingStar;
        }

        size (childSize: Size, rm: Segment[][], cm: Segment[][]) {
            for (var i = this.row; i < this.row + this.rowspan; i++) {
                childSize.height += rm[i][i].offered;
            }
            for (var i = this.col; i < this.col + this.colspan; i++) {
                childSize.width += cm[i][i].offered;
            }
        }
    }
}