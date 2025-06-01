// src/components/SettingsModal.ts

import { APIService } from '../services/APIService';

export interface SettingsModalOptions {
    apiService: APIService;
    onApiKeyUpdated: () => void;
}

export class SettingsModal {
    private apiService: APIService;
    private onApiKeyUpdated: () => void;

    // DOM Elements managed by this component
    private settingsButtonElement: HTMLButtonElement | null;
    private modalElement: HTMLElement | null;
    private apiKeyInputElement: HTMLInputElement | null;
    private rememberApiKeyCheckboxElement: HTMLInputElement | null;
    private saveSettingsButtonElement: HTMLButtonElement | null;
    private closeSettingsButtonElement: HTMLButtonElement | null;
    private cancelSettingsButtonElement: HTMLButtonElement | null;

    // A flag to ensure event listeners are only attached once.
    private listenersAttached: boolean = false;

    constructor(options: SettingsModalOptions) {
        this.apiService = options.apiService;
        this.onApiKeyUpdated = options.onApiKeyUpdated;

        this.settingsButtonElement = document.getElementById('settingsButton') as HTMLButtonElement | null;
        this.modalElement = document.getElementById('settingsModal') as HTMLElement | null;
        this.apiKeyInputElement = document.getElementById('apiKeyInput') as HTMLInputElement | null;
        this.rememberApiKeyCheckboxElement = document.getElementById('rememberApiKey') as HTMLInputElement | null;
        this.saveSettingsButtonElement = document.getElementById('saveSettings') as HTMLButtonElement | null;
        this.closeSettingsButtonElement = document.getElementById('closeSettingsModal') as HTMLButtonElement | null;
        this.cancelSettingsButtonElement = document.getElementById('cancelSettings') as HTMLButtonElement | null;

        this.init();
    }

    private init(): void {
        if (!this.modalElement ||
            !this.settingsButtonElement ||
            !this.apiKeyInputElement ||
            !this.rememberApiKeyCheckboxElement ||
            !this.saveSettingsButtonElement ||
            !this.closeSettingsButtonElement ||
            !this.cancelSettingsButtonElement) {
            console.error("SettingsModal: One or more required DOM elements for the modal were not found. Ensure the HTML structure is correct.");
            return;
        }
        this.setupEventListeners();
        // Initial API key load into the input field is handled by open()
        // or by AudioTranscriptionApp's own initializeAPIKey for the global state.
        // This component mainly syncs the input when it opens.
    }

    private setupEventListeners(): void {
        // Prevent adding listeners multiple times if this instance were somehow re-initialized
        // though with current usage (newed once in AudioTranscriptionApp) this isn't strictly necessary.
        if (this.listenersAttached) {
            return;
        }

        this.settingsButtonElement?.addEventListener('click', this.open);
        this.closeSettingsButtonElement?.addEventListener('click', this.close);
        this.cancelSettingsButtonElement?.addEventListener('click', this.close);
        this.saveSettingsButtonElement?.addEventListener('click', this.handleSaveSettings);

        this.modalElement?.addEventListener('click', (e) => {
            if (e.target === this.modalElement) {
                this.close();
            }
        });
        this.listenersAttached = true;
    }

    private loadApiKeyToInput(): void {
        const savedApiKey = localStorage.getItem('geminiApiKey');
        if (this.apiKeyInputElement) {
            this.apiKeyInputElement.value = savedApiKey || '';
        }
        if (this.rememberApiKeyCheckboxElement) {
            // If a key is saved, default to 'remember me' being checked.
            // If no key is saved, it doesn't make sense to check 'remember me'.
            this.rememberApiKeyCheckboxElement.checked = !!savedApiKey;
        }
    }

    private handleSaveSettings = (): void => { // Use arrow function for correct 'this'
        if (!this.apiKeyInputElement || !this.rememberApiKeyCheckboxElement || !this.apiService) {
            console.error("SettingsModal: Missing critical elements or services for save operation.");
            return;
        }

        const apiKey = this.apiKeyInputElement.value.trim();
        const rememberKey = this.rememberApiKeyCheckboxElement.checked;

        if (apiKey) {
            if (rememberKey) {
                localStorage.setItem('geminiApiKey', apiKey);
            } else {
                // If not remembering, but a key is provided, still use it for the session,
                // but remove it from localStorage if it was there.
                localStorage.removeItem('geminiApiKey');
            }
            this.apiService.setApiKey(apiKey);
        } else {
            // If API key input is cleared
            localStorage.removeItem('geminiApiKey');
            this.apiService.setApiKey(''); // Signal to APIService that key is cleared
        }

        if (this.onApiKeyUpdated) {
            this.onApiKeyUpdated();
        }
        this.close();
    }

    // Public methods
    public open = (): void => { // Use arrow function for correct 'this' if passed as callback
        if (!this.modalElement) return;
        this.loadApiKeyToInput(); // Load current state from localStorage when opening
        this.modalElement.style.setProperty('display', 'flex');
    }

    public close = (): void => { // Use arrow function for correct 'this'
        if (!this.modalElement) return;
        this.modalElement.style.setProperty('display', 'none');
    }

    // Optional: A cleanup method to remove event listeners if the component were to be destroyed
    public cleanup(): void {
        this.settingsButtonElement?.removeEventListener('click', this.open);
        this.closeSettingsButtonElement?.removeEventListener('click', this.close);
        this.cancelSettingsButtonElement?.removeEventListener('click', this.close);
        this.saveSettingsButtonElement?.removeEventListener('click', this.handleSaveSettings);

        // Note: The modal click-outside listener is anonymous, harder to remove without storing
        // the bound function reference. For this app's lifecycle, it might not be an issue.
        // If it were, we'd do: this.boundModalClickListener = (e) => { ... };
        // and then this.modalElement?.removeEventListener('click', this.boundModalClickListener);

        this.listenersAttached = false;
        console.log("SettingsModal event listeners cleaned up.");
    }
}
