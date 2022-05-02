module minerva.text.layout {
    export class Line {
        runs: Run[] = [];
        width: number = 0;
        height: number = 0;

        static getLineFromY(lines: Line[], y: number) {
            var line: layout.Line;
            for (var i = 0, oy = 0.0; i < lines.length; i++) {
                line = lines[i];
                oy += line.height;
                if (y < oy)
                    return line;
            }
            return lines[lines.length - 1];
        }

        static elliptify(docctx: IDocumentContext, docassets: IDocumentAssets, line: layout.Line, measureTextWidth: (text: string, font: Font) => number): boolean {
            if (docctx.textTrimming === TextTrimming.None
                || docctx.textWrapping !== TextWrapping.NoWrap
                || line.width <= docassets.maxWidth)
                return false;

            var newRuns: layout.Run[] = [];
            for (var runs = line.runs, total = 0, i = 0; i < runs.length; i++) {
                var run = runs[i];
                total += run.width;
                newRuns.push(run);
                if (total >= docassets.maxWidth) {
                    total -= run.width;
                    layout.Run.elliptify(run, docassets.maxWidth - total, docctx.textTrimming, measureTextWidth);
                    line.width = total + run.width;
                    break;
                }
            }
            line.runs = newRuns;
            return true;
        }
    }
}