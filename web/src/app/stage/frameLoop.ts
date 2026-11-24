// Every frame: v1's scene animates, the stage draws; a resize lays both out again.
import { app, stage } from '../boot/pixi.ts';
import { scene } from '../scene/scene.ts';
import { setUiSync } from './overlays.ts';

export function startFrameLoop(): void {
  app.renderer.on('resize', () => {
    stage.resize();
    setUiSync(true);
  });
  app.ticker.add(() => {
    if (scene.update(performance.now())) stage.redraw();
    stage.update();
  });
}
