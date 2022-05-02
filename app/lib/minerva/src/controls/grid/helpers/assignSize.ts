module minerva.controls.grid.helpers {
    export function assignSize (mat: Segment[][], start: number, end: number, size: number, unitType: GridUnitType, desiredSize: boolean): number {
        var count = 0;
        var assigned = false;
        var segmentSize = 0;
        for (var i = start; i <= end; i++) {
            var cur = mat[i][i];
            segmentSize = desiredSize ? cur.desired : cur.offered;
            if (segmentSize < cur.max)
                count += (unitType === GridUnitType.Star) ? cur.stars : 1;
        }

        do {
            assigned = false;
            var contribution = size / count;
            for (i = start; i <= end; i++) {
                cur = mat[i][i];
                segmentSize = desiredSize ? cur.desired : cur.offered;
                if (!(cur.type === unitType && segmentSize < cur.max))
                    continue;
                var newSize = segmentSize;
                newSize += contribution * (unitType === GridUnitType.Star ? cur.stars : 1);
                newSize = Math.min(newSize, cur.max);
                assigned = assigned || (newSize > segmentSize);
                size -= newSize - segmentSize;
                if (desiredSize)
                    cur.desired = newSize;
                else
                    cur.offered = newSize;
            }
        } while (assigned);
        return size;
    }
}