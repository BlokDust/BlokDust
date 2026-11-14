<p align="center"><img src="docs/media/blokdust-laser.gif" width="800" alt="BlokDust: a rotating laser plays a ring of tones and fires particle emitters"></p>

# BlokDust 2

A visual, physics-driven music playground. Drop blocks on a grid; nearby blocks connect; particle emitters and lasers
fire into sound sources to make self-playing musical environments. A faithful, much faster rebuild of
[BlokDust v1](https://github.com/BlokDust/BlokDust/tree/v1-legacy) (2015), for the web and as VST3/AU plug-ins and a standalone app.

**Play it:** [blokdust.funputs.com](https://blokdust.funputs.com/) · **Plug-ins:** Settings › DOWNLOAD on the site
(macOS and Windows, free)

> **Status:** 2.0 is out (November 2026): the website and the free plug-ins for macOS and Windows. Next: an iPad
> (AUv3) version. See the [roadmap](docs/plans/roadmap.md) and [what's new since v1](CHANGELOG.md).

- **Docs:** [docs/](docs/README.md) · [architecture](docs/architecture/overview.md) · [decisions](docs/decisions/README.md) · [specs](docs/specs/README.md)
- **Agents:** read [AGENTS.md](AGENTS.md)
- **Tools:** `pnpm install && pnpm bd list` · registry in [tools/README.md](tools/README.md)

## Source and version history
This repository is the public home of BlokDust 2, starting with version **2.0.2**. The `master` branch contains V2;
new contributions should target it. V2 was introduced as a source snapshot after the original V1 history.

The original application and its history remain available on the [v1-legacy branch](https://github.com/BlokDust/BlokDust/tree/v1-legacy)
and at the [v1-before-v2 tag](https://github.com/BlokDust/BlokDust/tree/v1-before-v2). V1 retains its MIT license;
V2 is AGPL-3.0-or-later, with the original attribution and notices preserved in [NOTICE.md](NOTICE.md).

Clone the current source with `git clone https://github.com/BlokDust/BlokDust.git`. Local setup and verification
commands are in [docs/engineering/toolchain.md](docs/engineering/toolchain.md) and [AGENTS.md](AGENTS.md).

## Credits
BlokDust is a collaboration between Luke Twyman, Luke Phillips and Ed Silverton, released in 2016
([the original](https://github.com/BlokDust/BlokDust/tree/v1-legacy)). This rebuild was released in 2026, built by Luke Phillips.

## License
[AGPL-3.0-or-later](LICENSE). Portions derived from BlokDust v1 (MIT), see [NOTICE.md](NOTICE.md). Patches you make are yours.
