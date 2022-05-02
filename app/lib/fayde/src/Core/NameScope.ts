module Fayde {
    export class NameScope {
        IsRoot: boolean = false;
        private XNodes = {};

        constructor(isRoot?: boolean) {
            if (isRoot)
                this.IsRoot = isRoot;
        }

        FindName(name: string): XamlNode {
            return this.XNodes[name];
        }
        RegisterName(name: string, xnode: XamlNode) {
            var existing = this.XNodes[name];
            if (existing && existing !== xnode)
                throw new InvalidOperationException("Name is already registered.");
            //TODO: Add Handler - Destroyed Event (xnode)
            this.XNodes[name] = xnode;
        }
        UnregisterName(name: string) {
            //var xnode = this.XNodes[name];
            //TODO: Remove Handler - Destroyed Event (xnode)
            this.XNodes[name] = undefined;
        }
        Absorb(otherNs: NameScope) {
            var on = otherNs.XNodes;
            for (var name in on) {
                this.RegisterName(name, on[name]);
            }
        }
    }
}