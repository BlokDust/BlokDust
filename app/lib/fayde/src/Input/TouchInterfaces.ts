interface Touch {
    radiusX: number;
    radiusY: number;
    rotationAngle: number;
    force: number;
}

interface TouchList {
    identifiedTouch(identifier: number): Touch;
}

interface TouchEvent extends UIEvent {
    initTouchEvent(type: string, canBubble: boolean, cancelable: boolean, view: any, detail: number, ctrlKey: boolean, altKey: boolean, shiftKey: boolean, metaKey: boolean, touches: TouchList, targetTouches: TouchList, changedTouches: TouchList);
}