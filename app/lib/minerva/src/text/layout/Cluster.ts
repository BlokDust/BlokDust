module minerva.text.layout {
    var isFirefox = /firefox/i.test(navigator.userAgent);

    export class Cluster {
        isSelected: boolean = false;
        text: string = null;
        width: number = 0;

        static DEFAULT_SELECTION_BG = new FakeBrush("#444444");
        static DEFAULT_SELECTION_FG = new FakeBrush("#FFFFFF");

        static render (cluster: Cluster, assets: ITextAssets, ctx: core.render.RenderContext) {
            var fontHeight = assets.font.getHeight();
            var area = new Rect(0, 0, cluster.width, fontHeight);

            var raw = ctx.raw;

            //Background
            var bg = cluster.isSelected ? (assets.selectionBackground || Cluster.DEFAULT_SELECTION_BG) : assets.background;
            if (bg) {
                raw.beginPath();
                raw.rect(area.x, area.y, area.width, area.height);
                ctx.fillEx(bg, area);
            }

            //Text
            var fg = cluster.isSelected ? (assets.selectionForeground || Cluster.DEFAULT_SELECTION_FG) : assets.foreground;
            var fg5 = "#000000";
            if (fg) {
                fg.setupBrush(raw, area);
                fg5 = fg.toHtml5Object();
            }
            raw.fillStyle = fg5;
            raw.font = assets.font.toHtml5Object();
            raw.textAlign = "left";
            if (isFirefox) {
                raw.textBaseline = "bottom";
                raw.fillText(cluster.text, 0, fontHeight);
            } else {
                raw.textBaseline = "top";
                raw.fillText(cluster.text, 0, 0);
            }

            //Underline
            if (assets.isUnderlined) {
                raw.beginPath();
                raw.moveTo(0, fontHeight);
                raw.lineTo(cluster.width, fontHeight);
                raw.lineWidth = 2;
                raw.strokeStyle = fg5;
                raw.stroke();
            }
        }
    }
}