interface TourStep {
  elementSelector?: string; // Optional, as some steps might be general introductions
  title: string;
  content: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Welcome to Voice Notes!",
    content: "This quick tour will guide you through the main features of the application."
  },
  {
    elementSelector: ".editor-title",
    title: "Note Title",
    content: "You can set a title for your note here. Click to edit it."
  },
  {
    elementSelector: ".tab-navigation-container",
    title: "Note Tabs",
    content: "Switch between 'Polished' (AI-enhanced) and 'Raw' (direct transcription) views of your note."
  },
  {
    elementSelector: "#polishedNote",
    title: "Polished Note Area",
    content: "Your AI-polished notes will appear here. You can directly edit the content."
  },
  {
    elementSelector: "#rawTranscription",
    title: "Raw Transcription Area",
    content: "The raw, unedited transcription from your voice input will be displayed here."
  },
  {
    elementSelector: "#recordButton",
    title: "Record Button",
    content: "Click this button to start or stop recording your voice."
  },
  {
    elementSelector: "#settingsButton",
    title: "Settings",
    content: "Access application settings, including your API key, here."
  },
  {
    elementSelector: "#newButton",
    title: "New Note",
    content: "Click here to clear the current note and start a new one."
  },
  {
    elementSelector: "#advancedExportButton",
    title: "Export Options",
    content: "Export your notes in various formats with advanced options."
  },
  {
    title: "Tour Complete!",
    content: "You're all set! Feel free to explore and start creating notes."
  }
];

let currentStep = 0;
let highlightedElement: Element | null = null;

const tourModal = document.getElementById("tourModal") as HTMLElement;
const tourTitle = document.getElementById("tourTitle") as HTMLElement;
const tourContent = document.getElementById("tourContent") as HTMLElement;
const previousButton = document.getElementById("tourPreviousButton") as HTMLButtonElement;
const nextButton = document.getElementById("tourNextButton") as HTMLButtonElement;
const finishButton = document.getElementById("tourFinishButton") as HTMLButtonElement;
const skipButton = document.getElementById("skipTourButton") as HTMLButtonElement;

function showTourModal() {
  if (tourModal) tourModal.style.display = "flex"; // Assuming modal-overlay uses flex
}

function hideTourModal() {
  if (tourModal) tourModal.style.display = "none";
  localStorage.setItem("hasSeenOnboardingTour", "true"); // Updated flag name
  removeHighlight();
}

function removeHighlight() {
  if (highlightedElement) {
    highlightedElement.classList.remove("tour-highlight-element");
    highlightedElement = null;
  }
}

function addHighlight(selector: string) {
  removeHighlight(); // Remove previous highlight
  const element = document.querySelector(selector);
  if (element) {
    highlightedElement = element;
    highlightedElement.classList.add("tour-highlight-element");
    // Scroll element into view if it's not visible
    highlightedElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function displayStep(stepIndex: number) {
  if (stepIndex < 0 || stepIndex >= tourSteps.length) {
    hideTourModal();
    return;
  }

  currentStep = stepIndex;
  const step = tourSteps[stepIndex];

  if (tourTitle) tourTitle.textContent = step.title;
  if (tourContent) tourContent.textContent = step.content;

  if (step.elementSelector) {
    addHighlight(step.elementSelector);
  } else {
    removeHighlight(); // No element to highlight for this step
  }

  // Button visibility
  if (previousButton) previousButton.style.display = stepIndex === 0 ? "none" : "inline-block";
  if (nextButton) nextButton.style.display = stepIndex === tourSteps.length - 1 ? "none" : "inline-block";
  if (finishButton) finishButton.style.display = stepIndex === tourSteps.length - 1 ? "inline-block" : "none";
}

function nextStep() {
  displayStep(currentStep + 1);
}

function previousStep() {
  displayStep(currentStep - 1);
}

/**
 * Initializes and shows the onboarding tour if it hasn't been completed.
 */
function startOnboardingTourIfNeeded() {
  const tourCompleted = localStorage.getItem("hasSeenOnboardingTour");
  if (!tourCompleted) {
    // Ensure event listeners are only added once if this function can be called multiple times
    // Using a data attribute to track if listener is attached.
    if (nextButton && !nextButton.dataset.listenerAttached) {
        nextButton.addEventListener("click", nextStep);
        nextButton.dataset.listenerAttached = "true";
    }
    if (previousButton && !previousButton.dataset.listenerAttached) {
        previousButton.addEventListener("click", previousStep);
        previousButton.dataset.listenerAttached = "true";
    }
    if (finishButton && !finishButton.dataset.listenerAttached) {
        finishButton.addEventListener("click", hideTourModal);
        finishButton.dataset.listenerAttached = "true";
    }
    if (skipButton && !skipButton.dataset.listenerAttached) {
        skipButton.addEventListener("click", hideTourModal);
        skipButton.dataset.listenerAttached = "true";
    }
    
    currentStep = 0; // Reset to first step
    displayStep(0);
    showTourModal();
  }
}

// This function can be called at app startup to ensure elements are ready
// and to potentially set up other things if needed, separate from starting the tour.
function initializeTour() {
  console.log("Onboarding tour module initialized and ready.");
  // Element references are already globally declared in this file,
  // so they should be available if the DOM is loaded when this is called.
  // If there were issues, we might re-query them here.
}

export { initializeTour, startOnboardingTourIfNeeded };
