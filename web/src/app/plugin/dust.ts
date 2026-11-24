import { juce } from '../boot/page.ts';
import { app, stage } from '../boot/pixi.ts';
import { theme } from '../boot/theme.ts';
import { dpr } from '../input/pointerState.ts';
import { automation, ccBySlot } from '../model/patchModel.ts';
import { inside } from '../model/stageWorlds.ts';
import { scene } from '../scene/scene.ts';

export function init(): void {
  // ---- Dust 1–8 (plugin only, PLUGIN-0003): right-click an options-panel slider to map a host parameter to it ----
  app.canvas.addEventListener('contextmenu', (e) => {
    if (!juce || inside) return; // Dust 1–8 move the outer world's blocks (CHG-0038)
    const hit = scene.sliderAt(e.offsetX * dpr(), e.offsetY * dpr());
    if (!hit) return;
    e.preventDefault();
    document.getElementById('dust-menu')?.remove();
    const menu = document.createElement('div');
    menu.id = 'dust-menu';
    const c = theme.colors;
    // v1's panel layer (OptionsPanel, Header): palette 2 at 90%, and at 16% reaching 5 units below it. No blur: no
    // gradients anywhere in BlokDust.
    const alpha = (a: number) => c[2].replace(/,\s*[\d.]+\)$/, `,${a})`),
      u5 = (5 * stage.metrics.unit) / stage.metrics.dpr;
    menu.style.cssText =
      `position:fixed;left:${e.clientX}px;top:${e.clientY}px;z-index:10;background:${alpha(0.9)};color:${c[theme.roles.txt]};` +
      `font:400 13px Dosis, sans-serif;letter-spacing:.05em;padding:6px 0;min-width:150px;box-shadow:0 ${u5}px 0 ${alpha(0.16)}`;
    const key = `${hit.block.Id}:${hit.setting}`,
      current = automation.get(key) ?? 0;
    const title = document.createElement('div');
    title.textContent = `${hit.block.BlockName} › ${hit.name}`.toUpperCase();
    title.style.cssText = 'padding:4px 14px 8px;opacity:.6';
    menu.appendChild(title);
    for (let slot = 0; slot <= 8; slot++) {
      const item = document.createElement('div');
      item.textContent = slot ? `${slot === current ? '● ' : ''}DUST ${slot}` : 'CLEAR';
      item.style.cssText = `padding:5px 14px;cursor:pointer;${slot === 0 && !current ? 'opacity:.4' : ''}`;
      item.onmouseenter = () => {
        item.style.background = c[theme.roles.menu[slot % 4]];
      };
      item.onmouseleave = () => {
        item.style.background = '';
      };
      item.onclick = () => {
        for (const [k, v] of automation) if (v === slot && slot) automation.delete(k);
        if (slot) automation.set(key, slot);
        else automation.delete(key);
        juce?.emitEvent('bd_automation', { slot, id: hit.block.Id, param: hit.setting });
        menu.remove();
      };
      menu.appendChild(item);
    }
    // MIDI learn (CHG-0004 3.9): the next CC the plugin receives drives this slot.
    if (current) {
      const learn = document.createElement('div');
      const cc = ccBySlot.get(current);
      learn.textContent = cc === undefined ? 'LEARN MIDI CC' : `CC ${cc} · LEARN AGAIN`;
      learn.dataset.learn = String(current);
      learn.style.cssText =
        'padding:8px 14px 5px;cursor:pointer;border-top:1px solid rgb(255 255 255/.12);margin-top:4px';
      learn.onmouseenter = () => {
        learn.style.background = c[theme.roles.menu[0]];
      };
      learn.onmouseleave = () => {
        learn.style.background = '';
      };
      learn.onclick = () => {
        juce?.emitEvent('bd_learnCC', { slot: current });
        learn.textContent = 'MOVE A KNOB…';
        setTimeout(() => menu.remove(), 900);
      };
      menu.appendChild(learn);
    }
    document.body.appendChild(menu);
    setTimeout(
      () =>
        window.addEventListener(
          'pointerdown',
          (ev) => {
            if (!menu.contains(ev.target as Node)) menu.remove();
          },
          { once: true },
        ),
      0,
    );
  });
}
