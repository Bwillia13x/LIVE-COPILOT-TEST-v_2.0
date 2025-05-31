/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ErrorHandler } from '../../utils.js'; // Assuming ErrorHandler might be needed, and showToast
import { showToast } from '../../utils.js'; // Importing showToast directly

export interface TabNavigatorOptions {
  tabNavigationContainerSelector: string; // e.g., '.tab-navigation'
  tabButtonSelector: string; // e.g., '.tab-button'
  activeTabIndicatorSelector: string; // e.g., '.active-tab-indicator'
  contentPaneSelector: string; // e.g., '.note-content' (common class for panes)
  initialTabId?: string;
}

export class TabNavigator {
  private container: HTMLElement | null;
  private buttons: NodeListOf<HTMLButtonElement>;
  private activeTabIndicator: HTMLElement | null;
  // private contentPanes: NodeListOf<HTMLElement>; // Content pane management will be external
  private productionMonitor: any | null = null; // Optional: for event tracking
  private onTabSwitchCallback: (tabId: string) => void;

  constructor(options: TabNavigatorOptions, onTabSwitch: (tabId: string) => void, productionMonitorInstance?: any) {
    this.container = document.querySelector(options.tabNavigationContainerSelector);
    this.activeTabIndicator = this.container?.querySelector(options.activeTabIndicatorSelector) ?? null;
    this.productionMonitor = productionMonitorInstance || null;
    this.onTabSwitchCallback = onTabSwitch;

    if (!this.container) {
      ErrorHandler.logError(`Tab navigation container "${options.tabNavigationContainerSelector}" not found.`, 'TabNavigator');
      this.buttons = document.querySelectorAll('button.non-existent-selector') as NodeListOf<HTMLButtonElement>; // Empty NodeList
      // this.contentPanes = document.querySelectorAll('div.non-existent-selector') as NodeListOf<HTMLElement>; // Empty NodeList
      return;
    }

    this.buttons = this.container.querySelectorAll(options.tabButtonSelector);
    // this.contentPanes = document.querySelectorAll(options.contentPaneSelector); // Content panes managed externally

    this.setupEventListeners();

    if (options.initialTabId) {
      this.activateTab(options.initialTabId, true); // Activate without triggering external callback side effects initially
      // If the app needs to run the callback logic for the initial tab, it should call it separately after init.
    } else if (this.buttons.length > 0) {
      const firstTabId = this.buttons[0].dataset.tab;
      if (firstTabId) {
        this.activateTab(firstTabId, true);
      }
    }
  }

  private setupEventListeners(): void {
    this.buttons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        if (tabId) {
          this.activateTab(tabId);
          this.onTabSwitchCallback(tabId); // Call the callback
        }
      });
    });
  }

  public activateTab(tabId: string, isInitialSetup: boolean = false): void {
    try {
      let selectedButton: HTMLButtonElement | null = null;

      this.buttons.forEach(button => {
        if (button.dataset.tab === tabId) {
          button.classList.add('active');
          selectedButton = button;
        } else {
          button.classList.remove('active');
        }
      });

      // Content pane switching is now handled by the callback in AudioTranscriptionApp

      if (selectedButton && this.activeTabIndicator && this.container) {
        const buttonRect = selectedButton.getBoundingClientRect();
        const navRect = this.container.getBoundingClientRect();
        const relativeLeft = buttonRect.left - navRect.left;

        this.activeTabIndicator.style.left = `${relativeLeft}px`;
        this.activeTabIndicator.style.width = `${buttonRect.width}px`;
      }

      if (!isInitialSetup) { // Avoid logging during initial setup
        console.log(`Switched to tab: ${tabId}`);
        if (this.productionMonitor) {
          this.productionMonitor.trackEvent('tab_switched', {
            tab: tabId,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      ErrorHandler.logError(`Error switching to tab: ${tabId}`, error);
      showToast({
        type: 'error',
        title: 'Tab Switch Failed',
        message: `Unable to switch to tab ${tabId}.`,
      });
    }
  }
}
