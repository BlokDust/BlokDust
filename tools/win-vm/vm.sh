#!/usr/bin/env bash
# Drive an externally configured Windows ARM test VM. See docs/engineering/local-configuration.md.
# Commands: start, stop, status, sync, ssh, scp, put, get, shot, key, click.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
if [[ "${BLOKDUST_CONFIG_LOADED:-}" != 1 ]]; then
    exec node "$HERE/../lib/local-config.ts" --exec bash "$0" "$@"
fi
: "${BLOKDUST_VM_DIR:?Set BLOKDUST_VM_DIR in the external config.env}"
: "${BLOKDUST_VM_USER:?Set BLOKDUST_VM_USER in the external config.env}"
VM_DIR="$BLOKDUST_VM_DIR"
DISK="$VM_DIR/win11.qcow2"
VARS="$VM_DIR/efivars.fd"
ISO="$VM_DIR/Win11_arm64.iso"
VIRTIO="$VM_DIR/virtio-win.iso"
UNATTEND="$VM_DIR/unattend.iso"
KEY="$VM_DIR/id_ed25519"
QMP="$VM_DIR/qmp.sock"
PIDFILE="$VM_DIR/qemu.pid"
SSH_PORT="${BLOKDUST_VM_SSH_PORT:-2222}"
DISK_SIZE="${BLOKDUST_VM_DISK:-80G}"
RAM="${BLOKDUST_VM_RAM:-8192}"
CPUS="${BLOKDUST_VM_CPUS:-6}"

QEMU_SHARE="$(brew --prefix qemu)/share/qemu"
CODE_FD="$QEMU_SHARE/edk2-aarch64-code.fd"

qmp() { python3 -I "$HERE/qmp.py" "$QMP" "$@"; }

running() { [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; }



# A sound card whose output QEMU discards. Not for listening: a host with no
# audio device never calls processBlock (Logic and REAPER both stall a plugin
# whose audio is closed), so without one nothing MIDI-related can be tested,
# and REAPER stops at a first-run dialog asking for a device.
#
# The installer has only the firmware framebuffer (ramfb, fixed at 800x600):
# Windows Setup has no virtio-gpu driver. firstlogon.ps1 installs viogpudo,
# after which the installed VM runs on virtio-gpu at a size a plugin window
# fits in.
DISPLAY_DEVICE=(-device "virtio-gpu-pci,xres=${BLOKDUST_VM_XRES:-1440},yres=${BLOKDUST_VM_YRES:-900}")

launch() {
    local -a extra=("$@")
    running && { echo "already running (pid $(cat "$PIDFILE"))"; return; }
    rm -f "$QMP"

    qemu-system-aarch64 \
        -name win-test-vm \
        -machine virt,highmem=on -accel hvf -cpu host \
        -smp "$CPUS" -m "$RAM" \
        -drive if=pflash,format=raw,readonly=on,file="$CODE_FD" \
        -drive if=pflash,format=raw,file="$VARS" \
        "${DISPLAY_DEVICE[@]}" \
        -device qemu-xhci -device usb-kbd -device usb-tablet \
        -audiodev none,id=snd0 -device intel-hda -device hda-output,audiodev=snd0 \
        -drive if=none,id=hd,file="$DISK",format=qcow2,discard=unmap \
        -device "nvme,drive=hd,serial=${BLOKDUST_VM_SERIAL:-blokdust}" \
        -netdev user,id=n0,hostfwd=tcp:127.0.0.1:"$SSH_PORT"-:22 \
        -device virtio-net-pci,netdev=n0 \
        -qmp unix:"$QMP",server,nowait \
        -display none -vnc 127.0.0.1:5 \
        -pidfile "$PIDFILE" -daemonize \
        ${extra[@]+"${extra[@]}"}  # bash 3.2 (macOS): an empty array is "unbound" under set -u

    echo "started (pid $(cat "$PIDFILE")); VNC on 127.0.0.1:5905"
}


cmd_start() { launch; }

cmd_stop() {
    running || { echo "not running"; return; }
    qmp powerdown
    for _ in $(seq 1 120); do running || { echo stopped; return; }; sleep 1; done
    echo "still running after 2 min; '$0 kill' to force" >&2
}

cmd_kill() { running && qmp quit; rm -f "$PIDFILE"; }

cmd_ssh() {
    ssh -i "$KEY" -p "$SSH_PORT" \
        -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR \
        -o ConnectTimeout=5 ${BLOKDUST_VM_USER}@127.0.0.1 "$@"
}

cmd_scp() {
    scp -i "$KEY" -P "$SSH_PORT" \
        -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR "$@"
}


# Tracked and untracked-but-not-ignored files, so uncommitted work is tested
# exactly as it stands. Never node_modules or a build tree: the VM installs and
# builds its own, for its own platform.
cmd_sync() {
    local tarball="$VM_DIR/blokdust-src.tar"
    # COPYFILE_DISABLE: no macOS ._ metadata files in the tar (they showed up as bogus fixtures on Windows).
    (cd "$REPO" && git ls-files -z -co --exclude-standard | COPYFILE_DISABLE=1 tar --null -T - -cf "$tarball")
    cmd_scp "$tarball" "${BLOKDUST_VM_USER}@127.0.0.1:blokdust-src.tar"
    # Replace, don't overlay: files deleted here must disappear there too. Builds live outside (C:\blokdust-build).
    cmd_ssh 'if (Test-Path C:\blokdust) { Remove-Item -Recurse -Force C:\blokdust }; New-Item -ItemType Directory -Force C:\blokdust | Out-Null; tar -xf "$env:USERPROFILE\blokdust-src.tar" -C C:\blokdust; "synced"'
}

cmd_shot() {
    local out="${1:-$VM_DIR/screen.png}"
    qmp screendump "$out"
    echo "$out"
}

cmd_status() {
    if running; then echo "running (pid $(cat "$PIDFILE"))"; qmp status; else echo "stopped"; fi
}

case "${1:-}" in
    start|stop|kill|status|sync) "cmd_$1" ;;
    ssh)  shift; cmd_ssh "$@" ;;
    scp)  shift; cmd_scp "$@" ;;
    put) shift; cmd_scp "$1" "${BLOKDUST_VM_USER}@127.0.0.1:$2" ;;
    get) shift; cmd_scp "${BLOKDUST_VM_USER}@127.0.0.1:$1" "$2" ;;
    shot) shift; cmd_shot "$@" ;;
    key)  shift; qmp key "$@" ;;
    click) shift; qmp click "$1" "$2" "${BLOKDUST_VM_XRES:-1440}" "${BLOKDUST_VM_YRES:-900}" ;;
    *) sed -n '2,16p' "$0"; exit 2 ;;
esac
