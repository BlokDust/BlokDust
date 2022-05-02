module minerva.text.layout {
    export class Run {
        attrs: ITextAssets;
        text: string = "";
        start: number = 0;
        length: number = 0;
        width: number = 0;

        pre: Cluster;
        sel: Cluster;
        post: Cluster;

        static splitSelection(run: Run, start: number, end: number, measureWidth: (text: string, assets: ITextAssets) => number) {
            run.pre = run.sel = run.post = null;

            var rs = run.start;
            var re = rs + run.length;

            var prelen = Math.min(run.length, Math.max(0, start - rs));
            if (prelen > 0) {
                var pre = run.pre = new Cluster();
                pre.text = run.text.substr(0, prelen);
                pre.width = measureWidth(pre.text, run.attrs);
            }

            var postlen = Math.min(run.length, Math.max(0, re - end));
            if (postlen > 0) {
                var post = run.post = new Cluster();
                post.text = run.text.substr(run.length - postlen);
                post.width = measureWidth(post.text, run.attrs);
            }

            var ss = Math.min(re, Math.max(rs, start));
            var se = Math.max(rs, Math.min(re, end));
            var sellen = Math.max(0, se - ss);
            if (sellen > 0) {
                var sel = run.sel = new Cluster();
                sel.isSelected = true;
                sel.text = run.text.substr(ss - rs, sellen);
                sel.width = measureWidth(sel.text, run.attrs);
            }
        }

        static elliptify(run: Run, available: number, textTrimming: TextTrimming, measureTextWidth: (text: string, font: Font) => number) {
            if (run.width < available)
                return;
            var text = run.text;
            var font = run.attrs.font;
            var measure = (index: number) => measureTextWidth(text.substr(0, index), font);
            if (textTrimming === TextTrimming.WordEllipsis) {
                shortenWord(run, available - measureTextWidth("...", font), measure);
            } else { //CharacterEllipsis
                shortenChar(run, available - measureTextWidth("...", font), measure);
            }
        }
    }

    function shortenWord(run: Run, available: number, measure: (index: number) => number) {
        if (available > 0) {
            var len = run.text.length;
            for (var i = 0, next = 0; (i = next) < len && (next = run.text.indexOf(' ', i + 1)) !== -1;) {
                if (measure(next) > available) {
                    run.text = run.text.substr(0, i);
                    break;
                }
            }
            if (len === run.text.length)
                return;
        } else {
            run.text = "";
        }
        run.text += "...";
        run.length = run.text.length;
        run.width = measure(run.length);
    }

    function shortenChar(run: Run, available: number, measure: (index: number) => number) {
        if (available > 0) {
            var len = run.text.length;
            var low = 0;
            var high = len;
            var i = Math.ceil(low + (high - low) / 2);
            for (var rawr = 0; (high - low) > 1 && rawr < 1000; i = Math.ceil(low + (high - low) / 2), rawr++) {
                if (measure(i) > available) {
                    high = i;
                } else {
                    low = i;
                }
            }
            run.text = run.text.substr(0, low);
            if (len === run.text.length)
                return;
        } else {
            run.text = "";
        }
        run.text += "...";
        run.length = run.text.length;
        run.width = measure(run.length);
    }
}