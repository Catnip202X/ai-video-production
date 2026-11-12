# Library film styles (Lemo-Opuscar)

66 film styles from [Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) by LemoLab (code and docs MIT, demo films CC BY 4.0; catalog taken at commit `9eb7739`, 2026-11-10). Each style has a `STYLE.md`: a style prompt covering essence and what it is not, materials and rendering, colour logic, type and subtitles, motion and camera grammar. Every demo was made in code, with no video generation. Gallery: <https://lemomo-ai.github.io/lemo-opuscar/>.

They are visual languages like the ones in [visual-languages.md](visual-languages.md), and the same rules apply: one per video, picked in the storyboard's *Visual style / look* field, first use is a pilot shot.

## Get the library

```bash
git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar ~/lemo-opuscar   # or: git -C ~/lemo-opuscar pull
```

Read `styles/<folder>/STYLE.md` for the chosen style. `styles/README.md` maps English names, Chinese names and folders. `TECHNIQUE.md` and `core/README.md` describe the shared toolkit.

## Two ways to render

1. **Their toolkit** (best for 3D, WebGL and footage styles). A style is a web page that exposes `window.render(t)` (deterministic), `window.DUR` and `window.READY`. `core/render/video.mjs` captures it frame by frame in headless Chrome. That matches our frame-pure rule. Install with `sh plugin/skills/lemo-opuscar/scripts/setup.sh deps` (Node 20+, ffmpeg, Python). Drive the page's timeline from our `timeline.json`, and mux our VO and SFX in the usual way.
2. **Our Remotion project** (best for 2D canvas and SVG styles inside a narrated explainer). Port the style's grammar into the shot components: palette roles, materials, type, motion and camera moves. The engine code in the demo folder (`setup.sh demo <slug>`) shows the techniques. Read it, don't copy whole files.

Either way, our pipeline wins where they differ:

- The VO is ours: sentence-level MamboTTS, ASR-checked, with shots timed to it. Their Kokoro or edge-tts narration is not used.
- Subtitles, covers in two ratios and publishing follow our references.
- The creator picks the palette. A `STYLE.md` palette is an example, not a default.
- Take the grammar, never the demo's story, characters or layouts. Clawd (in *Living Screencast* and *OPUSCAR 98*) stays out of our videos.

## Overlap with our own languages

| Our language | Closest library style | Use |
|---|---|---|
| 手绘草图 rough.js | `whiteboard`, `chalkboard` | Their files add camera and pacing ideas; rough.js stays the tool |
| 水墨 / 水彩 p5.brush | `ink-wash`, `watercolor`, `urban-sketch` | Their stroke models (ribbon plus bristle tracks, layered wash) are a tested recipe |
| 板书动画 manim | `chalkboard`, `dataviz` | manim stays for formulas; `dataviz` for charts that tell the story |
| IMPACT 大字 | `swiss-motion`, `pictogram-motion` | Pictogram ideas and Swiss grid rules |
| ASCII | `ascii-crt` | Ours stays the music-video default |
| 等距机械 anatomy | `iso-infographic`, `teardown`, `blueprint` | anatomy for mechanisms; these for processes and products |
| 3D three.js | the Materials & 3D styles, `lidar-survey`, `white-model` | Most of these are built on three.js; read the STYLE.md to check |

## Credits

Videos we make with a library style are ours; no credit is needed. Reusing their demo films or stills needs a CC BY 4.0 credit to LemoLab with a link to the repo. Six demo voice tracks are excluded from that licence (Chalkboard, Circuit Board, Desktop Flythrough, Isometric Picture Book, Printed Long Take, Broadcast News Package): never reuse them. Third-party assets in the demos keep their own licences (each demo's `CREDITS`).

## Catalog

### Edit & Documentary · 剪辑与纪实

| Style · 风格 | Folder | Good for |
|---|---|---|
| Caption News · 字幕新闻 | `caption-news` | Social news, Report explainers, Data shorts |
| 1920s Newsreel · 1920s 新闻影片 | `newsreel` | History stories, Fads & eras, Anniversaries |
| Live Countdown Split-screen · 实时倒计时分屏 | `countdown` | Launches, Countdowns, Live events |
| Time-lapse Symphony · 延时交响 | `city-symphony` | City films, Music montages, Openers |
| Visual Investigation · 视觉调查 | `visual-investigation` | Reconstructions, Fact-checks, Incident reports |
| Constructivist Montage · 构成主义蒙太奇 | `kino-montage` | Industry histories, Milestones, Collective effort |
| Sports Telestrator · 体育战术板 | `telestrator` | Sports analysis, Match recaps, Coaching |
| Broadcast News Package · 电视新闻包装 | `news-package` | News round-ups, Bulletins, Market updates |

### Evidence Films · 实证影像

| Style · 风格 | Folder | Good for |
|---|---|---|
| Satellite Briefing · 卫星简报 | `satellite-briefing` | Climate, News explainers, Geography |
| Engineering Briefing Board · 工程简报板 | `briefing-board` | Engineering, Option comparisons, Briefings |
| LiDAR Survey · 点云测绘 | `lidar-survey` | Heritage, Environment, Site surveys |
| Projection on White Model · 白模投影 | `white-model` | Urban planning, Exhibitions, City data |
| Data Physicalization · 数据实物化 | `data-physical` | Annual reports, Investor decks, Energy data |
| Exploded Teardown · 产品拆解 | `teardown` | Hardware launches, Product pages, Spec explainers |
| Microscope Story · 显微叙事 | `microscope` | Biomedicine, Materials science, Skincare science |
| Archive Light Table · 档案灯台 | `archive-lighttable` | Brand history, Archive stories, Museums |

### Hand-drawn & Painting · 手绘与绘画

| Style · 风格 | Folder | Good for |
|---|---|---|
| Crayon Picture Book · 蜡笔儿童绘本 | `crayon-book` | Picture books, Bedtime stories, Kids' learning |
| Watercolor Brush · 水彩笔刷 | `watercolor` | Nature documentary, Travel, Science explainers |
| Chinese Ink Wash · 中国水墨 | `ink-wash` | Wuxia, Cultural brands, Poetry |
| Impasto Oil Painting · 油画厚涂 | `impasto` | Music videos, Art & culture, Emotional ads |
| One-line Drawing · 一笔画 | `one-line` | Brand stories, Life milestones, Minimal ads |
| Whiteboard Explainer · 白板讲解 | `whiteboard` | Explainers, Online courses, Science |
| Urban Sketch · Pen & Wash · 钢笔淡彩 | `urban-sketch` | City & travel, Architecture, Lifestyle brands |
| Chalkboard · 黑板粉笔 | `chalkboard` | Word origins, Myth-busting, Lessons |

### East Asian Traditions · 东方传统

| Style · 风格 | Folder | Good for |
|---|---|---|
| Shadow Puppetry · 皮影戏 | `shadow-puppet` | Myths & folklore, Heritage, Festivals |
| Ukiyo-e · 浮世绘 | `ukiyoe` | Travel, Japanese culture, Poetry |
| Red Paper-cut · 红色窗花剪纸 | `papercut-red` | Lunar New Year, Festive greetings, Folk tales |
| Paper-cut Lightbox · 纸雕灯影 | `paper-lantern` | Journeys and travel, Farewells and anniversaries, Places and their stories |

### Print & Printmaking · 印刷与版画

| Style · 风格 | Folder | Good for |
|---|---|---|
| Risograph Print · Risograph 孔版印刷 | `risograph` | Indie brands, Zines, Lifestyle |
| Halftone Dossier · 复古半调案卷 | `halftone-dossier` | Humour, Pet content, Social shorts |
| Woodcut Print · 木刻版画 | `woodcut` | Folk tales, Craft brands, Book trailers |
| Copperplate Engraving · 铜版画 | `engraving` | Museum labels, Science explainers, Brand heritage |
| Silkscreen Travel Poster · 丝印旅行海报 | `silkscreen-poster` | Destination guides, Tourism, Event posters |
| Printed Long Take · 印刷长镜头 | `printed-long-take` | Journeys, Wildlife, Landscapes |

### Graphic & Type · 图形与排版

| Style · 风格 | Folder | Good for |
|---|---|---|
| Swiss Motion Graphics · 瑞士动态排版 | `swiss-motion` | Brand identity, Events, Design education |
| 60s Spy Title Sequence · 60s 间谍片头 | `spy-titles` | Title sequences, Event openers, Trailers |
| Art Deco · 装饰艺术 | `art-deco` | Luxury & hospitality, Galas, Invitations |
| Blueprint · 蓝图 / 工程制图 | `blueprint` | Engineering, Hardware launches, Tech explainers |
| Stained Glass · 彩色玻璃窗 | `stained-glass` | Legends, Heritage, Holiday stories |
| Pictogram Motion · 象形运动图形 | `pictogram-motion` | Public services and city stories, Brand and event identity films, Explainers told through signs and objects |
| ASCII / CRT Terminal · ASCII / CRT 终端 | `ascii-crt` | Developer tools, Sci-fi, Tech brands |

### Information & Keynote · 信息与发布

| Style · 风格 | Folder | Good for |
|---|---|---|
| Data Storytelling · 数据叙事 | `dataviz` | Data journalism, Reports, Climate & science |
| Isometric Infographic · 等距信息图 | `iso-infographic` | Process explainers, Supply chains, Annual reports |
| Dark Tech Keynote · 暗色科技发布 | `dark-keynote` | Product launches, SaaS, Keynotes |
| Living Screencast · 活体实机录屏 | `living-screencast` | Product tutorials, Feature launches, Onboarding |
| Sci-fi Hologram HUD · 科幻全息界面 | `hologram-hud` | Spec walkthroughs, Launch videos, Trade shows |
| Transit Map · 地铁线路图 | `transit-map` | Transport, Growth over time, Networks |
| Isometric Picture Book · 等距绘本 | `isometric-picture-book` | Everyday rules, Queues, Comparisons |
| Circuit Board · 电路板 | `circuit-board` | Energy, Supply chains, Devices |

### Cartoon & Anime · 卡通与动画

| Style · 风格 | Folder | Good for |
|---|---|---|
| 1930s Rubber Hose Cartoon · 1930s 橡皮管卡通 | `rubber-hose` | Food & drink, Retro ads, Kids |
| 80s Cel Anime · 80 年代赛璐璐动画 | `cel-anime-80s` | Music videos, Game trailers, Nostalgia |
| Sci-Fi Sitcom Toon · 科幻情景喜剧卡通 | `scifi-toon` | Comedy, Tech brands, Social shorts |
| Mid-century Cartoon · 50s 扁平卡通 | `midcentury-toon` | Set-up guides, Help centres, How-to |

### Games · 游戏

| Style · 风格 | Folder | Good for |
|---|---|---|
| 16-bit Pixel RPG · 16-bit 像素 RPG | `pixel-rpg` | Game trailers, Recaps, Nostalgia |
| HD-2D · HD-2D | `hd-2d` | Game trailers, Fantasy, Story films |
| Microgame Frenzy · 微游戏快闪 | `microgame` | Game trailers, Onboarding, Social shorts |
| Game Show Flat · 综艺节奏扁平 | `game-show` | Tech timelines, Year in review, Variety shows |

### Cinema & Eras · 电影与时代

| Style · 风格 | Folder | Good for |
|---|---|---|
| 1920s Silent Film · 1920s 默片 | `silent-film` | Comedy, Retro brands, Silent storytelling |
| Liminal Found Footage · 后室 / 新怪谈 | `backrooms` | Horror, Mystery & ARG, Game teasers |

### Materials & 3D · 材质与 3D

| Style · 风格 | Folder | Good for |
|---|---|---|
| Brick Toy · 积木玩具 | `brick-toy` | Toys & kids, Product builds, Space |
| Paper Pop-up Book · 纸片立体书 | `paper-popup` | Children's books, Game trailers, Story films |
| Tilt-Shift Miniature · 移轴微缩 | `tilt-shift` | City promos, Real estate, Transport |
| Low-poly Isometric Island · 低多边形等距 | `lowpoly-island` | Game trailers, World building, Calm content |
| Glass Product Render · 玻璃质感产品 | `glass-product` | Product launches, Consumer tech, Beauty |
| Memphis Diorama · 孟菲斯微缩景观 | `memphis-diorama` | Web heroes, Ambient loops, Seasons |
| Desktop Flythrough · 桌面穿梭 | `desktop-flythrough` | App explainers, Workflows, Products |
