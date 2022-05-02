module Fayde {
    export class VisualTreeEnum {
        static GetAncestors (uie: UIElement): nullstone.IEnumerable<UIElement> {
            return new AncestorsEnumerable(uie);
        }
    }

    class AncestorsEnumerable implements nullstone.IEnumerable<UIElement> {
        constructor (private uie: UIElement) {
        }

        getEnumerator (): nullstone.IEnumerator<UIElement> {
            var curNode: UINode = this.uie ? this.uie.XamlNode : null;
            var e = {
                current: undefined,
                moveNext (): boolean {
                    curNode = curNode ? curNode.VisualParentNode : undefined;
                    e.current = curNode ? curNode.XObject : undefined;
                    return e.current !== undefined;
                }
            };
            return e;
        }
    }
}