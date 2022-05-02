module Fayde.Controls.wrappanel {
    export module helpers {
        export function coerceChildSize (child: minerva.core.Updater, itemWidth: number, itemHeight: number) {
            var node = child.getAttachedValue("$node");
            var xobj = node ? node.XObject : null;
            if (!xobj)
                return;
            if (isNaN(child.assets.width) && !isNaN(itemWidth))
                xobj.Width = itemWidth;
            if (isNaN(child.assets.height) && !isNaN(itemHeight))
                xobj.Height = itemHeight;
        }
    }
}