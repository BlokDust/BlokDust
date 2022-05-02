module minerva.engine {
    export function process (down: core.Updater[], up: core.Updater[]): boolean {
        var updated = down.length > 0 || up.length > 0;
        processDown(down);
        processUp(up);
        return updated;
    }

    //Down --> RenderVisibility, HitTestVisibility, Transformation, Clip
    function processDown (list: core.Updater[]) {
        for (var updater: core.Updater; (updater = list[0]) != null;) {
            if (updater.processDown()) {
                list.shift();
            } else {
                list.push(list.shift());
            }
        }
        if (list.length > 0) {
            console.warn("[MINERVA] Finished DownDirty pass, not empty.");
        }
    }

    //Up --> Bounds, Invalidation
    function processUp (list: core.Updater[]) {
        for (var updater: core.Updater; (updater = list[0]) != null;) {
            var childIndex = updater.findChildInList(list);
            if (childIndex > -1) {
                // OPTIMIZATION: Parent is overzealous, children will invalidate him
                list.splice(childIndex + 1, 0, list.shift());
            } else if (updater.processUp()) {
                list.shift();
            }
        }
        if (list.length > 0) {
            console.warn("[MINERVA] Finished UpDirty pass, not empty.");
        }
    }
}