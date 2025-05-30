/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LoggerService } from '../utils.js';

export interface LazyModule {
  name: string;
  loader: () => Promise<any>;
  loaded: boolean;
  loading: boolean;
  error?: Error;
  module?: any;
}

export interface LoadingState {
  isLoading: boolean;
  loadedModules: Set<string>;
  failedModules: Set<string>;
  totalModules: number;
  loadedCount: number;
}

export class BundleOptimizer {
  private static instance: BundleOptimizer;
  private logger = LoggerService.getInstance();
  private modules = new Map<string, LazyModule>();
  private loadingState: LoadingState = {
    isLoading: false,
    loadedModules: new Set(),
    failedModules: new Set(),
    totalModules: 0,
    loadedCount: 0,
  };

  private constructor() {}

  public static getInstance(): BundleOptimizer {
    if (!BundleOptimizer.instance) {
      BundleOptimizer.instance = new BundleOptimizer();
    }
    return BundleOptimizer.instance;
  }

  public registerLazyModule(name: string, loader: () => Promise<any>): void {
    this.modules.set(name, {
      name,
      loader,
      loaded: false,
      loading: false,
    });
    
    this.loadingState.totalModules = this.modules.size;
    this.logger.debug(`Registered lazy module: ${name}`);
  }

  public async loadModule<T = any>(name: string): Promise<T> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`Module '${name}' not found`);
    }

    // Return cached module if already loaded
    if (module.loaded && module.module) {
      return module.module;
    }

    // Return loading promise if already loading
    if (module.loading) {
      return new Promise<T>((resolve, reject) => {
        const checkLoaded = () => {
          if (module.loaded && module.module) {
            resolve(module.module);
          } else if (module.error) {
            reject(module.error);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    // Start loading
    module.loading = true;
    this.loadingState.isLoading = true;

    try {
      this.logger.info(`Loading module: ${name}`);
      const startTime = performance.now();
      
      const loadedModule = await module.loader();
      
      const loadTime = performance.now() - startTime;
      this.logger.info(`Module '${name}' loaded in ${loadTime.toFixed(2)}ms`);

      module.module = loadedModule;
      module.loaded = true;
      module.loading = false;
      
      this.loadingState.loadedModules.add(name);
      this.loadingState.loadedCount++;

      this.updateLoadingState();
      return loadedModule;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      module.error = errorObj;
      module.loading = false;
      
      this.loadingState.failedModules.add(name);
      this.logger.error(`Failed to load module '${name}':`, errorObj);
      
      this.updateLoadingState();
      throw errorObj;
    }
  }

  public async loadModules(names: string[]): Promise<any[]> {
    const loadPromises = names.map(name => this.loadModule(name));
    return Promise.all(loadPromises);
  }

  public async loadModulesWithFallback(
    names: string[],
    fallbacks: (() => any)[]
  ): Promise<any[]> {
    const results: any[] = [];
    
    for (let i = 0; i < names.length; i++) {
      try {
        const module = await this.loadModule(names[i]);
        results.push(module);
      } catch (error) {
        this.logger.warn(`Using fallback for module '${names[i]}'`);
        results.push(fallbacks[i] ? fallbacks[i]() : null);
      }
    }
    
    return results;
  }

  public preloadModules(names: string[]): void {
    this.logger.info(`Preloading ${names.length} modules`);
    
    names.forEach(name => {
      // Load in background without blocking
      this.loadModule(name).catch(error => {
        this.logger.warn(`Preload failed for module '${name}':`, error);
      });
    });
  }

  public isModuleLoaded(name: string): boolean {
    const module = this.modules.get(name);
    return module ? module.loaded : false;
  }

  public isModuleLoading(name: string): boolean {
    const module = this.modules.get(name);
    return module ? module.loading : false;
  }

  public getLoadingState(): LoadingState {
    return { ...this.loadingState };
  }

  public getModuleInfo(name: string): LazyModule | undefined {
    const module = this.modules.get(name);
    return module ? { ...module } : undefined;
  }

  public getAllModules(): LazyModule[] {
    return Array.from(this.modules.values()).map(module => ({ ...module }));
  }

  private updateLoadingState(): void {
    const totalLoaded = this.loadingState.loadedModules.size;
    const totalFailed = this.loadingState.failedModules.size;
    const totalProcessed = totalLoaded + totalFailed;
    
    this.loadingState.loadedCount = totalLoaded;
    this.loadingState.isLoading = totalProcessed < this.loadingState.totalModules;
  }

  // Utility methods for common lazy loading patterns
  public async loadChartingModule(): Promise<any> {
    return this.loadModule('charting');
  }

  public async loadFileProcessingModule(): Promise<any> {
    return this.loadModule('fileProcessing');
  }

  public async loadAdvancedFeaturesModule(): Promise<any> {
    return this.loadModule('advancedFeatures');
  }

  // Performance optimization methods
  public async loadCriticalModules(): Promise<void> {
    const criticalModules = ['core', 'ui', 'audio'];
    const availableModules = criticalModules.filter(name => this.modules.has(name));
    
    if (availableModules.length > 0) {
      await this.loadModules(availableModules);
      this.logger.info(`Loaded ${availableModules.length} critical modules`);
    }
  }

  public async loadUserRequestedFeature(featureName: string): Promise<any> {
    const moduleMap: Record<string, string> = {
      'charts': 'charting',
      'export': 'fileProcessing',
      'collaboration': 'advancedFeatures',
      'analytics': 'analytics',
    };

    const moduleName = moduleMap[featureName];
    if (!moduleName) {
      throw new Error(`Unknown feature: ${featureName}`);
    }

    return this.loadModule(moduleName);
  }

  public generateLoadingReport(): string {
    const state = this.getLoadingState();
    const modules = this.getAllModules();
    
    const loadedModules = modules.filter(m => m.loaded);
    const failedModules = modules.filter(m => m.error);
    const pendingModules = modules.filter(m => !m.loaded && !m.error);

    return `
Bundle Loading Report
=====================
Total Modules: ${state.totalModules}
Loaded: ${loadedModules.length}
Failed: ${failedModules.length}
Pending: ${pendingModules.length}

Loaded Modules:
${loadedModules.map(m => `- ${m.name}`).join('\n')}

${failedModules.length > 0 ? `
Failed Modules:
${failedModules.map(m => `- ${m.name}: ${m.error?.message}`).join('\n')}
` : ''}

${pendingModules.length > 0 ? `
Pending Modules:
${pendingModules.map(m => `- ${m.name}`).join('\n')}
` : ''}
    `.trim();
  }

  public cleanup(): void {
    this.modules.clear();
    this.loadingState = {
      isLoading: false,
      loadedModules: new Set(),
      failedModules: new Set(),
      totalModules: 0,
      loadedCount: 0,
    };
    this.logger.info('Bundle optimizer cleaned up');
  }
}

// Lazy loading decorators and utilities
export function lazyLoad<T>(
  moduleLoader: () => Promise<T>,
  fallback?: () => T
): () => Promise<T> {
  let cached: T | null = null;
  let loading: Promise<T> | null = null;

  return async (): Promise<T> => {
    if (cached) {
      return cached;
    }

    if (loading) {
      return loading;
    }

    loading = moduleLoader().then(module => {
      cached = module;
      loading = null;
      return module;
    }).catch(error => {
      loading = null;
      if (fallback) {
        cached = fallback();
        return cached;
      }
      throw error;
    });

    return loading;
  };
}

// Component lazy loading helper
export function createLazyComponent<T>(
  loader: () => Promise<{ default: T }>,
  fallback?: T
): () => Promise<T> {
  return lazyLoad(
    async () => {
      const module = await loader();
      return module.default;
    },
    fallback ? () => fallback : undefined
  );
}
