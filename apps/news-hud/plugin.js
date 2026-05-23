window.NewsHUD = window.NewsHUD || {};

class NewsHUD {
  static meta = { category: 'Category 4: News, Media & Global Awareness', name: 'News HUD' };

  static _instances = {};

  static mockNews = [
    // global
    {
      stream: "global",
      headline: "Global Trade Corridors Realised Amid Shift in Supply Chains",
      source: "Reuters",
      category: "Global",
      snippet: "Multilateral alliances pave the way for new shipping channels, reducing global transit times by up to twelve percent.",
      bgUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop"
    },
    {
      stream: "global",
      headline: "International Climate Treaty Targets Methane Emissions Reduction",
      source: "BBC World",
      category: "Global",
      snippet: "Over eighty nations commit to strict inspection standards on agricultural and petrochemical production fields.",
      bgUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop"
    },
    // europe
    {
      stream: "europe",
      headline: "EU Proposes Unified Grid to Harness Offshore Wind Energy",
      source: "BBC World",
      category: "Europa",
      snippet: "A massive North Sea interconnection project aims to power over forty million homes with renewable energy by 2032.",
      bgUrl: "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=600&auto=format&fit=crop"
    },
    {
      stream: "europe",
      headline: "Continental High-Speed Rail Integration Enters Next Phase",
      source: "Reuters",
      category: "Europa",
      snippet: "Cross-border logistics and passenger transport systems see record funding to phase out short-haul flights.",
      bgUrl: "https://images.unsplash.com/photo-1541417904950-b855846fe074?q=80&w=600&auto=format&fit=crop"
    },
    // usa
    {
      stream: "usa",
      headline: "Infrastructure Overhaul Commences in Major US Industrial Hubs",
      source: "Bloomberg",
      category: "USA",
      snippet: "Federal backing accelerates modern bridge construction and heavy cargo rail upgrades across the Midwest.",
      bgUrl: "https://images.unsplash.com/photo-1513829096960-ef04e7c62754?q=80&w=600&auto=format&fit=crop"
    },
    {
      stream: "usa",
      headline: "Domestic Semiconductor Manufacturing Capacity Doubles in 18 Months",
      source: "Reuters",
      category: "USA",
      snippet: "Advanced fabrication facilities in Arizona and Ohio report high yields, bolstering national supply chains.",
      bgUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop"
    },
    // asia
    {
      stream: "asia",
      headline: "Smart Cities Across East Asia Leverage Edge AI for Transit Control",
      source: "Bloomberg",
      category: "Asien",
      snippet: "Municipal networks report a thirty percent drop in peak-hour congestion through dynamic signal coordination.",
      bgUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=600&auto=format&fit=crop"
    },
    {
      stream: "asia",
      headline: "Decarbonization Initiative Launches Across ASEAN Maritime Networks",
      source: "Reuters",
      category: "Asien",
      snippet: "Major ports introduce ammonia and hydrogen bunkering infrastructure to transition away from heavy fuel oils.",
      bgUrl: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?q=80&w=600&auto=format&fit=crop"
    },
    // nordic
    {
      stream: "nordic",
      headline: "Nordic Clean-Tech Consortia Secure Record Venture Funding",
      source: "Reuters",
      category: "Norden",
      snippet: "Sweden and Denmark base-metal processing developments achieve zero carbon emissions through green hydrogen use.",
      bgUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=600&auto=format&fit=crop"
    },
    {
      stream: "nordic",
      headline: "Danmark Lancering af Storskala Havvindmøllepark i Nordsøen",
      source: "Børsen",
      category: "Danmark",
      snippet: "Den nye energiø vil producere strøm svarende til forbruget i tre millioner husstande og eksportere overskuddet.",
      bgUrl: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?q=80&w=600&auto=format&fit=crop"
    },
    // finance
    {
      stream: "finance",
      headline: "Central Banks Shift Reserve Assets Towards Sovereign Green Bonds",
      source: "Bloomberg",
      category: "Finans & Markeder",
      snippet: "In a historic realignment, reserve managers increase ESG-compliant holdings, citing long-term stability benefits.",
      bgUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop"
    },
    {
      stream: "finance",
      headline: "Decentralized Settlement Layer Approved for International Clearing",
      source: "Bloomberg",
      category: "Finans & Markeder",
      snippet: "Major banking houses complete trial runs of tokenized asset settlements, slicing clearing times to seconds.",
      bgUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=600&auto=format&fit=crop"
    },
    // tech
    {
      stream: "tech",
      headline: "Open-Source LLMs Achieve Parity with Proprietary Commercial Systems",
      source: "Reuters",
      category: "Teknologi & AI",
      snippet: "New training paradigms training systems allow capability models to run locally on mid-range hardware.",
      bgUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop"
    },
    {
      stream: "tech",
      headline: "Quantum Annealing Deployed for Global Cargo Routing Optimizations",
      source: "BBC World",
      category: "Teknologi & AI",
      snippet: "Logistics companies utilize hybrid classical-quantum models to navigate weather disruptions and lower fuel costs.",
      bgUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop"
    }
  ];


  static _getInstance(containerSelector) {
    var selector = containerSelector || '#hud-container';
    if (!NewsHUD._instances[selector]) {
      var defaultSettings = {
        newsMode: 'ticker',
        glassOpacity: 0.8,
        scale: 1.0,
        customTitle: undefined,
        streams: ['global', 'europe', 'finance']
      };
      NewsHUD._instances[selector] = {
        containerSelector: selector,
        settings: defaultSettings,
        overlayElement: null
      };
    }
    return NewsHUD._instances[selector];
  }

  static init(options) {
    try {
      options = options || {};
      var containerSelector = options.container || '#hud-container';
      var defaultSettings = {
        newsMode: 'ticker',
        glassOpacity: 0.8,
        scale: 1.0,
        customTitle: undefined,
        streams: ['global', 'europe', 'finance']
      };
      var instance = {
        containerSelector: containerSelector,
        settings: Object.assign({}, defaultSettings, options.settings || {}),
        overlayElement: null
      };
      NewsHUD._instances[containerSelector] = instance;
      console.log("News HUD: Initialized for " + containerSelector);
    } catch (err) {
      console.error("News HUD Init Error:", err);
    }
  }

  static mount(containerSelector) {
    try {
      var instance = NewsHUD._getInstance(containerSelector);
      var container = document.querySelector(instance.containerSelector) || document.body;
      if (!container) {
        throw new Error("Target container not found: " + instance.containerSelector);
      }

      var existingPanel = container.querySelector('.news-panel');
      if (existingPanel) {
        existingPanel.remove();
      }

      var styleTag = document.getElementById('sh-news-theme-styles');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'sh-news-theme-styles';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = `
        @keyframes news-ticker-crawl {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        
        .news-panel {
          font-family: 'Outfit', 'Inter', sans-serif !important;
        }

        .news-panel .news-item.card {
          background: rgba(10, 12, 18, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          height: 200px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          transition: transform 0.3s ease;
        }
        
        .news-panel .news-item.card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 240, 255, 0.3);
        }
      `;

      var panel = document.createElement('div');
      panel.className = 'news-panel';

      Object.assign(panel.style, {
        pointerEvents: 'auto',
        backdropFilter: 'blur(20px) saturate(120%)',
        WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        border: 'none',
        borderRadius: '24px',
        padding: '24px 36px',
        boxShadow: 'none',
        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      });

      panel.style.position = 'absolute';
      panel.style.width = 'max-content';
      panel.style.height = 'max-content';
      panel.style.maxWidth = 'none';
      panel.style.maxHeight = 'none';
      panel.style.boxSizing = 'border-box';

      panel.innerHTML = `
        <div class="panel-header" style="
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.12);
          padding: 6px 16px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
          text-align: center;
          margin-bottom: 20px;
          box-sizing: border-box;
        ">
          NEWS REEL
        </div>
        <div class="news-list" style="
          box-sizing: border-box !important;
        ">
          <!-- Rendered News Content -->
        </div>
      `;

      container.appendChild(panel);
      instance.overlayElement = panel;

      NewsHUD._updatePositionAndGlass(containerSelector);
      NewsHUD._updateDOM(containerSelector);

      console.log("News HUD: Mounted to " + containerSelector);
    } catch (err) {
      console.error("News HUD Mount Error:", err);
    }
  }

  static update(arg1, arg2) {
    try {
      var newSettings, containerSelector;
      if (typeof arg1 === 'string') {
        containerSelector = arg1;
        newSettings = arg2;
      } else {
        newSettings = arg1;
        containerSelector = arg2;
      }

      var instance = NewsHUD._getInstance(containerSelector);
      if (!instance.settings) return;

      instance.settings = Object.assign({}, instance.settings, newSettings || {});

      NewsHUD._updatePositionAndGlass(containerSelector);
      NewsHUD._updateDOM(containerSelector);
      console.log("News HUD: Updated settings for " + containerSelector + ":", newSettings);
    } catch (err) {
      console.error("News HUD Update Error:", err);
    }
  }

  static unmount(containerSelector) {
    var selector = containerSelector || '#hud-container';
    var instance = NewsHUD._instances[selector];
    if (instance && instance.overlayElement) {
      instance.overlayElement.remove();
      instance.overlayElement = null;
    }
    console.log("News HUD: Unmounted " + selector);
  }

  static destroy(containerSelector) {
    var selector = containerSelector || '#hud-container';
    NewsHUD.unmount(selector);
    var instance = NewsHUD._instances[selector];
    if (instance) {
      instance.containerSelector = null;
      instance.settings = null;
      delete NewsHUD._instances[selector];
    }
    console.log("News HUD: Destroyed " + selector);
  }

  static _updatePositionAndGlass(containerSelector) {
    var instance = NewsHUD._getInstance(containerSelector);
    if (!instance.overlayElement || !instance.settings) return;

    var panel = instance.overlayElement;
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.alignItems = 'center';
    panel.style.position = 'absolute';
    panel.style.width = 'max-content';
    panel.style.height = 'max-content';
    panel.style.maxWidth = 'none';
    panel.style.maxHeight = 'none';
    panel.style.boxSizing = 'border-box';

    panel.style.top = 'auto';
    panel.style.bottom = 'auto';
    panel.style.left = 'auto';
    panel.style.right = 'auto';
    panel.style.transform = 'none';

    var normalized = containerSelector.toLowerCase();
    var scale = (instance.settings.scale !== undefined) ? parseFloat(instance.settings.scale) : 1.0;

    if (normalized.indexOf('1') !== -1 || normalized.indexOf('top-left') !== -1 || normalized.indexOf('topleft') !== -1) {
      panel.style.top = '30px';
      panel.style.left = '30px';
      panel.style.transformOrigin = 'top left';
      panel.style.transform = 'scale(' + scale + ')';
    } else if (normalized.indexOf('2') !== -1 || normalized.indexOf('top-center') !== -1 || normalized.indexOf('topcenter') !== -1) {
      panel.style.top = '30px';
      panel.style.left = '50%';
      panel.style.transformOrigin = 'top center';
      panel.style.transform = 'translateX(-50%) scale(' + scale + ')';
    } else if (normalized.indexOf('3') !== -1 || normalized.indexOf('top-right') !== -1 || normalized.indexOf('topright') !== -1) {
      panel.style.top = '30px';
      panel.style.right = '30px';
      panel.style.transformOrigin = 'top right';
      panel.style.transform = 'scale(' + scale + ')';
    } else if (normalized.indexOf('4') !== -1 || normalized.indexOf('middle-left') !== -1 || normalized.indexOf('middleleft') !== -1) {
      panel.style.top = '50%';
      panel.style.left = '30px';
      panel.style.transformOrigin = 'center left';
      panel.style.transform = 'translateY(-50%) scale(' + scale + ')';
    } else if (normalized.indexOf('5') !== -1 || normalized.indexOf('middle-center') !== -1 || normalized.indexOf('middlecenter') !== -1) {
      panel.style.top = '50%';
      panel.style.left = '50%';
      panel.style.transformOrigin = 'center center';
      panel.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
    } else if (normalized.indexOf('6') !== -1 || normalized.indexOf('middle-right') !== -1 || normalized.indexOf('middleright') !== -1) {
      panel.style.top = '50%';
      panel.style.right = '30px';
      panel.style.transformOrigin = 'center right';
      panel.style.transform = 'translateY(-50%) scale(' + scale + ')';
    } else if (normalized.indexOf('7') !== -1 || normalized.indexOf('bottom-left') !== -1 || normalized.indexOf('bottomleft') !== -1) {
      panel.style.bottom = '30px';
      panel.style.left = '30px';
      panel.style.transformOrigin = 'bottom left';
      panel.style.transform = 'scale(' + scale + ')';
    } else if (normalized.indexOf('8') !== -1 || normalized.indexOf('bottom-center') !== -1 || normalized.indexOf('bottomcenter') !== -1) {
      panel.style.bottom = '30px';
      panel.style.left = '50%';
      panel.style.transformOrigin = 'bottom center';
      panel.style.transform = 'translateX(-50%) scale(' + scale + ')';
    } else if (normalized.indexOf('9') !== -1 || normalized.indexOf('bottom-right') !== -1 || normalized.indexOf('bottomright') !== -1) {
      panel.style.bottom = '30px';
      panel.style.right = '30px';
      panel.style.transformOrigin = 'bottom right';
      panel.style.transform = 'scale(' + scale + ')';
    } else {
      panel.style.transformOrigin = 'center center';
      panel.style.transform = 'scale(' + scale + ')';
    }

    var mode = instance.settings.newsMode || 'ticker';
    if (mode === 'cinematic' || mode === 'ticker') {
      panel.style.setProperty('background', 'transparent', 'important');
      panel.style.setProperty('backdrop-filter', 'none', 'important');
      panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
      panel.style.setProperty('border', 'none', 'important');
      panel.style.setProperty('box-shadow', 'none', 'important');
    } else {
      var opacity = parseFloat(instance.settings.glassOpacity);
      if (opacity === 0) {
        panel.style.setProperty('background', 'rgba(15, 18, 25, 0)', 'important');
        panel.style.setProperty('backdrop-filter', 'none', 'important');
        panel.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
      } else {
        panel.style.setProperty('background', 'rgba(15, 18, 25, ' + opacity + ')', 'important');
        panel.style.removeProperty('backdrop-filter');
        panel.style.removeProperty('-webkit-backdrop-filter');
      }
      panel.style.removeProperty('border');
      panel.style.removeProperty('box-shadow');
    }
  }

  static _updateDOM(containerSelector) {
    var instance = NewsHUD._getInstance(containerSelector);
    if (!instance.overlayElement || !instance.settings) return;

    var listContainer = instance.overlayElement.querySelector('.news-list');
    if (!listContainer) return;

    var titleElement = instance.overlayElement.querySelector('.panel-header');
    if (titleElement) {
      var defaultTitle = 'NEWS REEL';
      var displayTitle = instance.settings.customTitle !== undefined ? instance.settings.customTitle : defaultTitle;
      if (displayTitle.trim() === '') {
        titleElement.style.display = 'none';
      } else {
        titleElement.style.display = 'block';
        titleElement.textContent = displayTitle;
      }
    }

    var mode = instance.settings.newsMode || 'ticker';
    listContainer.innerHTML = '';

    // Dynamically filter mock news based on configured streams list
    var displayItems = [];
    var usedIndices = {};
    var streams = instance.settings.streams || ['global', 'europe', 'finance'];

    streams.forEach((streamType, idx) => {
      var matches = NewsHUD.mockNews.filter(item => item.stream === streamType);
      if (matches.length > 0) {
        var selectIndex = 0;
        for (var k = 0; k < matches.length; k++) {
          var globalIdx = NewsHUD.mockNews.indexOf(matches[k]);
          if (!usedIndices[globalIdx]) {
            selectIndex = k;
            usedIndices[globalIdx] = true;
            break;
          }
        }
        displayItems.push(matches[selectIndex]);
      } else {
        displayItems.push(NewsHUD.mockNews[idx % NewsHUD.mockNews.length]);
      }
    });

    if (mode === 'ticker') {
      if (titleElement && titleElement.style.display !== 'none') {
        titleElement.style.marginBottom = '12px';
      }
      
      listContainer.style.display = 'block';
      listContainer.style.width = '600px';
      listContainer.style.overflow = 'hidden';
      
      var tickerWrap = document.createElement('div');
      tickerWrap.className = 'ticker-wrap';
      Object.assign(tickerWrap.style, {
        width: '100%',
        overflow: 'hidden'
      });

      var tickerTrack = document.createElement('div');
      tickerTrack.className = 'ticker-track';
      
      Object.assign(tickerTrack.style, {
        display: 'inline-flex',
        whiteSpace: 'nowrap',
        gap: '60px',
        alignItems: 'center',
        animation: 'news-ticker-crawl 45s linear infinite'
      });

      // Construct a looped array of items long enough to scroll continuously
      var loopNews = [];
      if (displayItems.length > 0) {
        while (loopNews.length < 12) {
          loopNews = loopNews.concat(displayItems);
        }
      } else {
        loopNews = NewsHUD.mockNews.concat(NewsHUD.mockNews);
      }

      var trackHtml = loopNews.map(item => {
        return `
          <span style="font-family: 'SF Mono', Consolas, monospace; font-size: 13px; font-weight: 600; color: #ffffff; display: flex; align-items: center; gap: 8px;">
            <span style="color: #00f0ff; font-size: 9px; font-weight: 700; text-transform: uppercase;">[${item.source}]</span>
            <span>${item.headline.toUpperCase()}</span>
            <span style="color: rgba(255, 255, 255, 0.4); margin-left: 52px; font-size: 14px;">•</span>
          </span>
        `;
      }).join('');

      tickerTrack.innerHTML = trackHtml;
      tickerWrap.appendChild(tickerTrack);
      listContainer.appendChild(tickerWrap);

    } else if (mode === 'editorial') {
      var colCount = Math.min(displayItems.length, 3);

      listContainer.style.display = 'grid';
      listContainer.style.gridTemplateColumns = 'repeat(' + colCount + ', 220px)';
      listContainer.style.gap = '15px';
      listContainer.style.justifyContent = 'center';
      listContainer.style.width = 'max-content';

      displayItems.forEach(item => {
        var card = document.createElement('div');
        card.className = 'news-item card';

        Object.assign(card.style, {
          flex: '0 0 auto',
          width: '220px',
          minWidth: '220px',
          minHeight: '200px',
          flexShrink: '0',
          boxSizing: 'border-box'
        });

        card.innerHTML = `
          <div class="news-thumbnail" style="
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-image: url('${item.bgUrl}');
            background-size: cover;
            background-position: center;
            filter: saturate(0.3) blur(1px);
            opacity: 0.4;
            z-index: 1;
          "></div>
          <div class="news-overlay" style="
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: linear-gradient(180deg, rgba(10, 12, 18, 0.3) 0%, rgba(10, 12, 18, 0.95) 100%);
            z-index: 2;
          "></div>
          <div class="news-content" style="
            position: relative;
            z-index: 3;
            padding: 16px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            height: 100%;
            box-sizing: border-box;
          ">
            <span style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
              ${item.category}
            </span>
            <h4 style="font-family: Georgia, serif; font-size: 13px; line-height: 1.3; color: #ffffff; font-weight: 600; margin: 0 0 6px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.headline}
            </h4>
            <p style="font-family: 'Inter', sans-serif; font-size: 10px; line-height: 1.4; color: rgba(255, 255, 255, 0.65); margin: 0 0 8px 0; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
              ${item.snippet}
            </p>
            <span style="font-size: 8px; font-weight: 700; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; letter-spacing: 0.05em;">
              ${item.source}
            </span>
          </div>
        `;
        listContainer.appendChild(card);
      });

    } else if (mode === 'cinematic') {
      listContainer.style.display = 'flex';
      listContainer.style.flexDirection = 'column';
      listContainer.style.gap = '20px';
      listContainer.style.width = '480px';

      displayItems.forEach(item => {
        var row = document.createElement('div');
        row.style.boxSizing = 'border-box';
        
        row.innerHTML = `
          <div style="font-size: 9px; font-weight: 700; color: #00f0ff; text-transform: uppercase; letter-spacing: 0.15em; text-shadow: 0 2px 8px rgba(0,0,0,0.9);">
            ${item.category} // ${item.source}
          </div>
          <div style="
            font-family: 'Outfit', sans-serif;
            font-size: 18px;
            font-weight: 800;
            color: #ffffff;
            line-height: 1.3;
            margin: 6px 0;
            text-shadow: 0 4px 12px rgba(0,0,0,0.85);
          ">
            ${item.headline}
          </div>
          <div style="
            font-family: 'Inter', sans-serif;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.4;
            margin: 4px 0 12px 0;
            text-shadow: 0 3px 8px rgba(0,0,0,0.85);
          ">
            ${item.snippet}
          </div>
        `;
        listContainer.appendChild(row);
      });
    }
  }
}

window.NewsHUD = NewsHUD;
