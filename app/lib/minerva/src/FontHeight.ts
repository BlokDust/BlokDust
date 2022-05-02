module minerva.fontHeight {
    var heights = [];

    export var cache = {
        hits: 0,
        misses: 0
    };

    export function get (font: Font): number {
        var serial = font.toHtml5Object();
        var height = heights[serial];
        if (height == null) {
            heights[serial] = height = measure(serial);
            cache.misses++;
        } else {
            cache.hits++;
        }
        return height;
    }


    var dummy: HTMLElement;

    function measure (serial: string): number {
        perfex.timer.start('MeasureFontHeight', serial);
        if (!dummy) {
            dummy = document.createElement("div");
            dummy.appendChild(document.createTextNode("Hg"));
            document.body.appendChild(dummy);
        }
        dummy.style.display = "";
        dummy.style.font = serial;
        var result = dummy.offsetHeight;
        dummy.style.display = "none";
        perfex.timer.stop();
        return result;
    }
}