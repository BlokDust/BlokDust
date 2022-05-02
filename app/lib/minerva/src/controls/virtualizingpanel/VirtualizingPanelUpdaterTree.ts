module minerva.controls.virtualizingpanel {
    export var NO_CONTAINER_OWNER: IVirtualizingContainerOwner = {
        itemCount: 0,
        createGenerator: function (): IVirtualizingGenerator {
            return {
                current: undefined,
                generate: function () {
                    return false;
                }
            };
        },
        remove: function (index: number, count: number) {
        }
    };

    export class VirtualizingPanelUpdaterTree extends panel.PanelUpdaterTree {
        containerOwner: IVirtualizingContainerOwner = NO_CONTAINER_OWNER;
    }
}