# Notices

BlokDust 2 is licensed under the GNU Affero General Public License v3.0 or later (see `LICENSE`). Its source code:
https://github.com/BlokDust/BlokDust

## Credits
BlokDust is a collaboration between Luke Twyman, Luke Phillips and Ed Silverton, developed in Brighton, UK, and
released in 2016 (https://github.com/BlokDust/BlokDust). This rebuild was released in 2026, built by Luke Phillips.

## BlokDust v1
Portions of BlokDust 2 are derived from BlokDust v1 (https://github.com/BlokDust/BlokDust), licensed under the MIT License (its notice, verbatim):

> Copyright (c) 2016 Luke Twymann, Luke Phillips and Edward Silverton
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Fonts
Dosis and Merriweather Sans are licensed under the SIL Open Font License 1.1.

## Chromium Web Audio algorithms
v1's sound comes from Web Audio nodes as implemented in Chromium, so the engine ports two of them to sound the same.

**DynamicsCompressor** (`engine/include/blokdust/dsp.hpp`, `MasterCompressor`), from Blink's
`platform/audio/dynamics_compressor.cc`:

> Copyright (C) 2011 Google Inc. All rights reserved. Redistribution and use in source and binary forms, with or without
> modification, are permitted provided that the following conditions are met: 1. Redistributions of source code must
> retain the above copyright notice, this list of conditions and the following disclaimer. 2. Redistributions in binary
> form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the
> documentation and/or other materials provided with the distribution. 3. Neither the name of Apple Computer, Inc.
> ("Apple") nor the names of its contributors may be used to endorse or promote products derived from this software
> without specific prior written permission. THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
> EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
> FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
> INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
> SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
> THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY
> WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

**PeriodicWave oscillator tables** (`engine/src/wavetable.cpp`, `engine/include/blokdust/dsp.hpp` `Oscillator`), from
Blink's `modules/webaudio/periodic_wave_handler.cc` and `oscillator_handler.cc`:

> Copyright The Chromium Authors. Redistribution and use in source and binary forms, with or without modification, are
> permitted provided that the following conditions are met: * Redistributions of source code must retain the above
> copyright notice, this list of conditions and the following disclaimer. * Redistributions in binary form must
> reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation
> and/or other materials provided with the distribution. * Neither the name of Google LLC nor the names of its
> contributors may be used to endorse or promote products derived from this software without specific prior written
> permission. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
> WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
> PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
> INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
> GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
> LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
> OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## Video export libraries
The web app's video export (Patches › VIDEO) loads these only when a video is made:
- **Mediabunny** (https://github.com/Vanilagy/mediabunny), Mozilla Public License 2.0. Its source code, unmodified,
  is available from that repository and npm (`mediabunny`).
- **@mediabunny/aac-encoder**, Mozilla Public License 2.0. It contains a WebAssembly build of FFmpeg's AAC encoder
  (libavcodec, https://ffmpeg.org/), licensed under the GNU Lesser General Public License 2.1 or later.

## QR codes
The plugins' SIGN IN (a code to approve on the website) draws its QR code with **qrcode-generator**
(https://github.com/kazuhikoarase/qrcode-generator), Copyright (c) 2009 Kazuhiko Arase, MIT License:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
> documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
> rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
> permit persons to whom the Software is furnished to do so, subject to the following conditions:
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
> Software.
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
> WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
> COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
> OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
> The word "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.

## Your patches
Patches you create are your own data. The AGPL applies to BlokDust's code, not to the patches made with it.

## Default sounds (Freesound, CC0)
New Sample and Granular blocks fetch these from Freesound at run time. They are not bundled or hosted by BlokDust,
and both are CC0, so no attribution is required; it is given anyway.
- "[Synth] ambient key" by waveplaySFX: https://freesound.org/people/waveplaySFX/sounds/223835/
- "Piano drone" by laserlife: https://freesound.org/people/laserlife/sounds/191167/
