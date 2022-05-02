module Fayde.Engine {
    export class Inspection {
        //Ctrl+Right Click to show context menu
        static TryHandle(type: Input.MouseInputType, isLeftButton: boolean, isRightButton: boolean, args: Input.MouseEventArgs, htlist: UINode[]): boolean {
            if (!Fayde.IsInspectionOn)
                return false;
            if (type !== Input.MouseInputType.MouseDown)
                return false;
            if (!isRightButton)
                return false;
            if (!Input.Keyboard.HasControl())
                return false;
            var pos = args.AbsolutePos;
            showMenu(pos, htlist);
            return true;
        }
        static Kill() {
            if (menu)
                menu.style.display = "none";
        }
    }
    
    var menu: HTMLDivElement = null;
    function showMenu(pos: Point, htlist: UINode[]) {
        menu = menu || createMenu();
        fillMenu(htlist);
        menu.style.left = pos.x.toString() + "px";
        menu.style.top = pos.y.toString() + "px";
        menu.style.display = "";
    }
    function createMenu(): HTMLDivElement {
        var m = document.createElement("div");
        m.style.position = "absolute";
        m.style.display = "none";
        m.style.backgroundColor = "rgba(128,128,128,1.0)";
        m.style.padding = "5px";
        m.style.fontFamily = "Tahoma";
        m.oncontextmenu = () => false;
        document.body.appendChild(m);
        return m;
    }
    function fillMenu(htlist: UINode[]) {
        menu.innerHTML = "";
        var len = htlist.length;
        for (var i = 0; i < len; i++) {
            menu.appendChild(createMenuItem(htlist[i]));
        }
    }
    function createMenuItem(cur: UINode) {
        var miDiv = document.createElement("div");
        miDiv.style.cursor = "pointer";
        miDiv.innerHTML = serializeUINode(cur);
        miDiv.onclick = () => handleMenuItemClick(cur);
        miDiv.onmouseenter = () => handleMenuItemEnter(miDiv);
        miDiv.onmouseleave = () => handleMenuItemLeave(miDiv);
        return miDiv;
    }
    function serializeUINode(uin: UINode): string {
        var cur = uin.XObject;

        var str = "";

        var id = (<any>cur)._ID;
        if (id) str += "[" + id + "] ";
        str += (<any>cur).constructor.name;
        
        var name = uin.Name;
        if (name) {
            str += " [";
            var ns = uin.NameScope;
            if (!ns)
                str += "^";
            else if (ns.IsRoot)
                str += "+";
            else
                str += "-";
            str += name + "]";
        }

        return str;
    }
    function handleMenuItemClick(uin: UINode) {
        menu.style.display = "none";
    }
    function handleMenuItemEnter(mi: HTMLDivElement) {
        mi.style.textDecoration = "underline";
    }
    function handleMenuItemLeave(mi: HTMLDivElement) {
        mi.style.textDecoration = "none";
    }
}