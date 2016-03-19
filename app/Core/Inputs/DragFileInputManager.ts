//
//export class DragFileInputManager {
//
//    public DragEnter = new nullstone.Event<DragEvent>();
//    public DragMove = new nullstone.Event<DragEvent>();
//    public DragLeave = new nullstone.Event<DragEvent>();
//    public Dropped = new nullstone.Event<DragEvent>();
//
//    constructor() {
//        var dropZone = document.getElementsByTagName('canvas')[0]; //TODo App.GetCanvas?
//        dropZone.addEventListener('dragenter', this.OnDragEnter.bind(this));
//        dropZone.addEventListener('dragover', this.OnDragMove.bind(this));
//        dropZone.addEventListener('dragleave', this.OnDragLeave.bind(this));
//        dropZone.addEventListener('drop', this.OnFileDropped.bind(this));
//    }
//
//    OnFileDropped(e) {
//        this.Dropped.raise(this, e);
//    }
//
//    OnDragEnter(e) {
//        this.DragEnter.raise(this, e);
//    }
//
//    OnDragMove(e) {
//        this.DragMove.raise(this, e);
//    }
//
//    OnDragLeave(e) {
//        this.DragLeave.raise(this, e);
//    }
//}