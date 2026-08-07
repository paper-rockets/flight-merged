const BASE_DEFAULTS = {
  treeColor0: '#ffffff',
  treeColor1: '#ddff88',
  treeColor2: '#88cc99',
  treeColor3: '#778855',
  treeColor4: '#aaffaa',
  treeColor5: '#bbdd99',
  treeColor6: '#669966',
  treeScale: 1.5,
  summerFilter: true,
  rain: false,
  rainIntensity: 0.5,
  fogPlane: true,
  fogDensity: 0.5,
  godRays: true,
  godRayIntensity: 0.65,
  bloom: true,
  wind: false,
  trails: true,
  exposure: 1.8,
  waterMode: 'realistic',
  waterColor: '#00fccd',
  waterOpacity: 0.85,
  waterShallowColor: '#0e5257',
  waterDeepColor: '#04171c',
  waterFoamColor: '#ebf5fc',
  waterWaveSpeed: 1.0,
  waterWaveHeight: 1.0,
  waterWaveFreq: 0.3,
  waterPatternDensity: 45,
  waterSwellWavelength: 1.0,
  waterSeaState: 0.45,
  waterDetailAmount: 1.0,
  waterFoamAmount: 1.0,
  // Atmosphere Overrides (Sky, Fog, Clouds)
  overrideSky: false,
  skyColorTop: '#8cbce6',
  ambientLightColor: '#dcf2ff',
  ambientLightIntensity: 0.9,
  dirLightColor: '#fffaeb',
  dirLightIntensity: 2.5,
  overrideFog: false,
  fogColor: '#8cbce6',
  fogDensityAtmo: 0.0015,
  overrideClouds: false,
  cloudColor0: '#ffffff',
  cloudColor1: '#f0f8ff',
  cloudColor2: '#e6e6fa',
  cloudColor3: '#ffebcd',
  cloudColor4: '#ffb6c1',
  cloudOpacityBase: 0.95,
  cloudOpacityHigh: 0.7,
  cloudOpacityWispy: 0.4,
  cloudOpacityMega: 1.0,
  // Biome Extras defaults
  extra_jungleFog: false,
  extra_jungleFogIntensity: 0.4,
  extra_jungleFogColor: '#2a5a3a',
  extra_ambientDarkness: 0.3,
  extra_snowLineHeight: 50,
  extra_mistDensity: 0.6,
  extra_mistColor: '#c8d8e8',
  extra_windStrength: 1.0,
  extra_grassSwaySpeed: 1.0,
  extra_goldenHourTint: '#ffddaa',
  extra_wheatDensity: 0.5,
  extra_crystalGlow: 0.5,
  extra_bioluminescence: false,
  extra_crystalFogColor: '#4ecdc4',
  extra_ambientWarmth: '#fff5e6',
  extra_meadowBrightness: 0.5
};

export class BiomeSettingsManager {
  constructor() {
    this._defaults = { ...BASE_DEFAULTS };
    this._overrides = {};
    this._saveTimeout = null;

    const saved = localStorage.getItem('biomeSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.defaults && parsed.overrides) {
            this._defaults = { ...BASE_DEFAULTS, ...parsed.defaults };
            this._overrides = parsed.overrides;
          } else {
            this._overrides = parsed;
          }
        }
      } catch (e) {
        console.warn('Failed to parse biomeSettings from localStorage:', e);
      }
    }
  }

  getDefaults() {
    return { ...this._defaults };
  }

  getOverrides(biomeName) {
    if (!biomeName || biomeName === 'All Biomes (Default)') {
      return {};
    }
    return { ...(this._overrides[biomeName] || {}) };
  }

  getEffective(biomeName) {
    return Object.assign({}, this.getDefaults(), this.getOverrides(biomeName));
  }

  setOverride(biomeName, key, value) {
    if (!biomeName || biomeName === 'All Biomes (Default)') {
      this._defaults[key] = value;
    } else {
      if (!this._overrides[biomeName]) {
        this._overrides[biomeName] = {};
      }
      this._overrides[biomeName][key] = value;
    }
    this._autoSave();
  }

  resetBiome(biomeName) {
    if (!biomeName || biomeName === 'All Biomes (Default)') {
      this._defaults = { ...BASE_DEFAULTS };
    } else {
      delete this._overrides[biomeName];
    }
    this._autoSave();
  }

  resetAll() {
    this._defaults = { ...BASE_DEFAULTS };
    this._overrides = {};
    this._autoSave();
  }

  hasOverrides(biomeName) {
    if (!biomeName || biomeName === 'All Biomes (Default)') {
      return Object.keys(this._overrides).length > 0;
    }
    return !!(this._overrides[biomeName] && Object.keys(this._overrides[biomeName]).length > 0);
  }

  // Force an immediate write to localStorage (used by the per-biome "Save" buttons).
  saveNow() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
      this._saveTimeout = null;
    }
    try {
      localStorage.setItem('biomeSettings', JSON.stringify({
        defaults: this._defaults,
        overrides: this._overrides
      }));
      return true;
    } catch (e) {
      console.warn('Failed to save biomeSettings:', e);
      return false;
    }
  }

  _autoSave() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = setTimeout(() => {
      try {
        const data = {
          defaults: this._defaults,
          overrides: this._overrides
        };
        localStorage.setItem('biomeSettings', JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to auto-save biomeSettings:', e);
      }
    }, 500);
  }
}
