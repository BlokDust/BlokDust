module minerva {
    export var NO_SIZE_UPDATER: ISizeUpdater = {
        setActualWidth (value: number) {
        },
        setActualHeight (value: number) {
        },
        onSizeChanged (oldSize: Size, newSize: Size) {
        }
    };

    export interface ISizeUpdater {
        setActualWidth(value: number);
        setActualHeight(value: number);
        onSizeChanged(oldSize: Size, newSize: Size);
    }
}