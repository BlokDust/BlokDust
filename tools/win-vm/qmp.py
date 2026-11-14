#!/usr/bin/env python3
"""Minimal QMP client for the configured Windows test VM.

    qmp.py SOCKET screendump OUT.png
    qmp.py SOCKET key ret [COUNT] [INTERVAL]
    qmp.py SOCKET type "some text"
    qmp.py SOCKET click X Y WIDTH HEIGHT     (pixel position on a WIDTHxHEIGHT screen)
    qmp.py SOCKET powerdown | quit | status

Standard library only, so it runs with `python3 -I` and needs no venv.
"""
import json
import socket
import sys
import time


def connect(path):
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect(path)
    f = s.makefile('rw')
    json.loads(f.readline())  # greeting
    send(f, {'execute': 'qmp_capabilities'})
    return s, f


def send(f, cmd):
    f.write(json.dumps(cmd) + '\n')
    f.flush()
    while True:
        reply = json.loads(f.readline())
        if 'event' in reply:
            continue
        if 'error' in reply:
            raise SystemExit(f"qmp error: {reply['error']}")
        return reply.get('return')


def key(f, name):
    send(f, {'execute': 'send-key', 'arguments': {'keys': [{'type': 'qcode', 'data': name}]}})


SHIFTED = {'_': 'minus', ':': 'semicolon', '"': 'apostrophe', '|': 'backslash', '?': 'slash',
           '>': 'dot', '<': 'comma', '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
           '^': '6', '&': '7', '*': '8', '(': '9', ')': '0', '+': 'equal', '{': 'bracket_left',
           '}': 'bracket_right', '~': 'grave_accent'}
PLAIN = {' ': 'spc', '-': 'minus', '.': 'dot', ',': 'comma', '/': 'slash', '\\': 'backslash',
         ';': 'semicolon', "'": 'apostrophe', '=': 'equal', '[': 'bracket_left', ']': 'bracket_right',
         '`': 'grave_accent', '\n': 'ret', '\t': 'tab'}


def type_text(f, text):
    for ch in text:
        if ch in PLAIN:
            keys = [PLAIN[ch]]
        elif ch in SHIFTED:
            keys = ['shift', SHIFTED[ch]]
        elif ch.isupper():
            keys = ['shift', ch.lower()]
        else:
            keys = [ch]
        send(f, {'execute': 'send-key',
                 'arguments': {'keys': [{'type': 'qcode', 'data': k} for k in keys]}})
        time.sleep(0.02)


def main():
    path, cmd, *args = sys.argv[1:]
    s, f = connect(path)
    try:
        if cmd == 'screendump':
            send(f, {'execute': 'screendump', 'arguments': {'filename': args[0], 'format': 'png'}})
        elif cmd == 'key':
            count = int(args[1]) if len(args) > 1 else 1
            interval = float(args[2]) if len(args) > 2 else 0.5
            for _ in range(count):
                key(f, args[0])
                time.sleep(interval)
        elif cmd == 'click':
            # The usb-tablet is an absolute device scaled to 0..32767 on each axis.
            x, y, width, height = (int(a) for a in args[:4])
            ax = round(x * 32767 / (width - 1))
            ay = round(y * 32767 / (height - 1))
            move = [{'type': 'abs', 'data': {'axis': 'x', 'value': ax}},
                    {'type': 'abs', 'data': {'axis': 'y', 'value': ay}}]
            send(f, {'execute': 'input-send-event', 'arguments': {'events': move}})
            time.sleep(0.1)
            for down in (True, False):
                send(f, {'execute': 'input-send-event', 'arguments': {
                    'events': [{'type': 'btn', 'data': {'down': down, 'button': 'left'}}]}})
                time.sleep(0.08)
        elif cmd == 'type':
            type_text(f, args[0])
        elif cmd == 'powerdown':
            send(f, {'execute': 'system_powerdown'})
        elif cmd == 'quit':
            send(f, {'execute': 'quit'})
        elif cmd == 'status':
            print(send(f, {'execute': 'query-status'}))
        else:
            raise SystemExit(f'unknown command {cmd}')
    finally:
        s.close()


if __name__ == '__main__':
    main()
