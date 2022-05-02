
module Fayde {
    export module Render {
        export var Debug = false;
        export var DebugIndent = 0;
    }

    export module Layout {
        export var Debug = false;
        export var DebugIndent = 0;
    }

    export module Media {
        export module Animation {
            export var Log = false;
            export var LogApply = false;
        }
        export module VSM {
            export var Debug = false;
        }
    }
    export module Data {
        export var Debug = false;
        export var IsCounterEnabled = false;
        export var DataContextCounter = 0;
    }
    export var IsInspectionOn = false;
}