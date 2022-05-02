module Fayde.Markup.Internal {
    export interface IResourcesActor {
        start();
        end();
        get(): ResourceDictionary[];
    }

    export function createResourcesActor (cur: IActiveObject, resources: ResourceDictionary[]): IResourcesActor {
        var stack: ResourceDictionary[] = [];
        return {
            start () {
                if (cur.rd)
                    stack.push(cur.rd);
            },
            end () {
                if (cur.rd)
                    stack.pop();
            },
            get (): ResourceDictionary[] {
                var res = (resources) ? resources.concat(stack) : stack.slice(0);
                if (cur.dobj instanceof FrameworkElement) {
                    var crd = cur.dobj.ReadLocalValue(FrameworkElement.ResourcesProperty);
                    if (crd !== DependencyProperty.UnsetValue)
                        res.push(crd);
                }
                return res;
            }
        }
    }
}