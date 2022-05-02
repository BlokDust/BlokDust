module nullstone.markup.xaml {
    export class SkipBranchError extends Error {
        root: Element;

        constructor(root: Element) {
            super("Cannot skip branch when element contains more than 1 child element.");
            Object.defineProperties(this, {
                "root": {value: root, writable: false}
            });
        }
    }
}