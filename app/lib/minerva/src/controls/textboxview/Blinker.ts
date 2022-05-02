module minerva.controls.textboxview {
    var CURSOR_BLINK_DIVIDER = 3;
    var CURSOR_BLINK_OFF_MULTIPLIER = 2;
    var CURSOR_BLINK_DELAY_MULTIPLIER = 3;
    var CURSOR_BLINK_ON_MULTIPLIER = 4;
    var CURSOR_BLINK_TIMEOUT_DEFAULT = 900;

    export class Blinker {
        isEnabled: boolean = true;
        isVisible: boolean = false;

        private $$blink_delay = CURSOR_BLINK_TIMEOUT_DEFAULT;
        private $$timeout = 0;
        private $$onChange: (isVisible: boolean) => void;

        constructor (onChange: (isVisible: boolean) => void) {
            this.$$onChange = onChange;
        }

        delay () {
            this.$disconnect();
            this.$connect(CURSOR_BLINK_DELAY_MULTIPLIER);
            this.$show();
        }

        begin () {
            if (this.$$timeout === 0) {
                this.$connect(CURSOR_BLINK_ON_MULTIPLIER);
                this.$show();
            }
        }

        end () {
            this.$disconnect();
            this.$hide();
        }

        private $connect (multiplier: number) {
            var delay = this.$$blink_delay * multiplier / CURSOR_BLINK_DIVIDER;
            this.$$timeout = window.setTimeout(() => this.$blink(), delay);
        }

        private $disconnect () {
            if (this.$$timeout !== 0) {
                window.clearTimeout(this.$$timeout);
                this.$$timeout = 0;
            }
        }

        private $blink () {
            if (this.isVisible) {
                this.$hide();
                this.$connect(CURSOR_BLINK_OFF_MULTIPLIER);
            } else {
                this.$show();
                this.$connect(CURSOR_BLINK_ON_MULTIPLIER);
            }
        }

        private $show () {
            if (this.isVisible)
                return;
            this.isVisible = true;
            this.$$onChange && this.$$onChange(true);
        }

        private $hide () {
            if (!this.isVisible)
                return;
            this.isVisible = false;
            this.$$onChange && this.$$onChange(false);
        }
    }
}