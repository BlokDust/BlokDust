module minerva.text.run {
    interface IRunLayoutPass {
        text: string;
        index: number;
        max: number;
    }

    export function doLayoutWrap (docctx: IDocumentContext, docassets: IDocumentAssets, assets: ITextAssets) {
        var pass: IRunLayoutPass = {
            text: assets.text,
            index: 0,
            max: assets.text.length
        };

        var font = assets.font;

        var line = new layout.Line();
        line.height = font.getHeight();
        docassets.actualHeight += line.height;
        docassets.lines.push(line);

        var run = new layout.Run();
        run.attrs = assets;
        line.runs.push(run);

        while (pass.index < pass.max) {
            var hitbreak = isFinite(docassets.maxWidth) ? advanceFinite(run, pass, font, docassets.maxWidth) : advanceInfinite(run, pass, font);
            if (hitbreak) {
                docassets.actualWidth = Math.max(docassets.actualWidth, run.width);
                line.width = run.width;
                line = new layout.Line();
                line.height = font.getHeight();
                docassets.actualHeight += line.height;
                docassets.lines.push(line);

                run = new layout.Run();
                run.attrs = assets;
                line.runs.push(run);
            }
        }
        line.width = run.width;
        docassets.actualWidth = Math.max(docassets.actualWidth, run.width);
    }

    function advanceInfinite (run: layout.Run, pass: IRunLayoutPass, font: Font): boolean {
        //NOTE: Returning true implies a new line is necessary
        var remaining = pass.text.substr(pass.index);
        var rindex = remaining.indexOf('\r');
        var nindex = remaining.indexOf('\n');

        if (rindex < 0 && nindex < 0) {
            //Didn't find \r or \n
            run.length = remaining.length;
            run.text = remaining;
            run.width = measureTextWidth(run.text, font);
            pass.index += run.length;
            return false;
        }

        if (rindex > -1 && rindex + 1 === nindex) {
            //Found \r\n
            run.length = nindex + 1;
            run.text = remaining.substr(0, run.length);
            run.width = measureTextWidth(run.text, font);
            pass.index += run.length;
            return true;
        }

        if (rindex > -1 && rindex < nindex) {
            //Found \r before \n, but not back-to-back
            run.length = rindex + 1;
            run.text = remaining.substr(0, run.length);
            run.width = measureTextWidth(run.text, font);
            pass.index += run.length;
            return true;
        }

        //Found \n (potentially before \r, don't care)
        run.length = nindex + 1;
        run.text = remaining.substr(0, run.length);
        run.width = measureTextWidth(run.text, font);
        pass.index += run.length;
        return true;
    }

    function advanceFinite (run: layout.Run, pass: IRunLayoutPass, font: Font, maxWidth: number): boolean {
        //NOTE: Returning true implies a new line is necessary
        var text = pass.text;
        var start = pass.index;
        var lastSpace = -1;
        var c: string;
        var curText = "";
        var curWidth = 0;
        while (pass.index < pass.max) {
            c = text.charAt(pass.index);
            curText += c;
            curWidth = measureTextWidth(curText, font);
            if (c === '\n') {
                run.length = pass.index - start + 1;
                run.text = text.substr(start, run.length);
                run.width = measureTextWidth(run.text, font);
                pass.index++;
                return true;
            } else if (c === '\r') {
                run.length = pass.index - start + 1;
                pass.index++;
                if (text.charAt(pass.index) === '\n') {
                    run.length++;
                    pass.index++;
                }
                run.text = text.substr(start, run.length);
                run.width = measureTextWidth(run.text, font);
                return true;
            }
            if (curWidth > maxWidth) {
                var breakIndex = (lastSpace > -1) ? lastSpace + 1 : pass.index;
                run.length = (breakIndex - start) || 1; //Force at least 1 character
                run.text = text.substr(start, run.length);
                run.width = measureTextWidth(run.text, font);
                pass.index = start + run.length;
                return pass.index < pass.max;
            }
            if (c === ' ')
                lastSpace = pass.index;
            pass.index++;
        }
        run.text = text.substr(start);
        run.length = run.text.length;
        run.width = measureTextWidth(run.text, font);
        return false;
    }

    function measureTextWidth (text: string, font: Font): number {
        return engine.Surface.measureWidth(text, font);
    }
}