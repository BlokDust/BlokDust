module Fayde {
    interface IReactable {
        $$reaction_sources: any[];
        $$reactions: IReaction[];
    }
    interface IReaction {
        (val?: any);
    }

    export function Incite (obj: any, val?: any) {
        if (!obj)
            return;
        var reactions = (<IReactable>obj).$$reactions;
        if (!reactions)
            return;
        var rs = (<IReactable>obj).$$reaction_sources;
        for (var i = 0; i < reactions.length; i++) {
            reactions[i].call(rs[i], val);
        }
    }

    export function ReactTo (obj: any, scope: any, changed: (val?: any) => any) {
        if (!obj)
            return;
        var rs = obj.$$reaction_sources;
        if (!rs) {
            rs = [];
            Object.defineProperty(obj, "$$reaction_sources", {value: rs, enumerable: false});
        }
        rs.push(scope);
        var reactions = obj.$$reactions;
        if (!reactions) {
            reactions = [];
            Object.defineProperty(obj, "$$reactions", {value: reactions, enumerable: false});
        }
        reactions.push(changed);
    }

    export function UnreactTo (obj: any, scope: any) {
        if (!obj)
            return;
        var reactions = obj.$$reactions;
        if (!reactions)
            return;
        var rs = obj.$$reaction_sources;
        var index = rs.indexOf(scope);
        if (index < 0)
            return;
        rs.splice(index, 1);
        reactions.splice(index, 1);
    }
}