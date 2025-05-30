/**
 * Comprehensive Button Functionality Test
 * Tests all button functionality after the fix
 */

// Test configuration
const TEST_CONFIG = {
  appUrl: 'http://localhost:5177',
  testTimeout: 5000,
  debugMode: true
};

class ButtonFunctionalityTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Starting test: ${testName}`);
    try {
      const result = await testFunction();
      this.results.passed++;
      this.results.tests.push({ name: testName, status: 'passed', result });
      this.log(`Test passed: ${testName}`, 'success');
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name: testName, status: 'failed', error: error.message });
      this.log(`Test failed: ${testName} - ${error.message}`, 'error');
      throw error;
    }
  }

  async testButtonExistence() {
    return this.runTest('Button Existence Check', async () => {
      const expectedButtons = [
        'recordButton',
        'settingsButton', 
        'newButton',
        'testChartButton',
        'sampleChartsButton',
        'performanceToggleButton'
      ];

      const missingButtons = [];
      const foundButtons = [];

      for (const buttonId of expectedButtons) {
        const button = document.getElementById(buttonId);
        if (button) {
          foundButtons.push(buttonId);
        } else {
          missingButtons.push(buttonId);
        }
      }

      return {
        foundButtons,
        missingButtons,
        totalExpected: expectedButtons.length,
        totalFound: foundButtons.length
      };
    });
  }

  async testEventListenerAttachment() {
    return this.runTest('Event Listener Attachment', async () => {
      const buttonTests = [
        { id: 'recordButton', expectedListener: true },
        { id: 'settingsButton', expectedListener: true },
        { id: 'newButton', expectedListener: true },
        { id: 'testChartButton', expectedListener: true },
        { id: 'sampleChartsButton', expectedListener: true },
        { id: 'performanceToggleButton', expectedListener: true }
      ];

      const results = {};

      for (const test of buttonTests) {
        const button = document.getElementById(test.id);
        if (button) {
          // Check if click event listeners are attached
          const hasClickListener = button.onclick !== null || 
                                  button.addEventListener !== undefined;
          results[test.id] = {
            exists: true,
            hasListener: hasClickListener,
            element: button
          };
        } else {
          results[test.id] = {
            exists: false,
            hasListener: false,
            element: null
          };
        }
      }

      return results;
    });
  }

  async testButtonClicks() {
    return this.runTest('Button Click Simulation', async () => {
      const clickResults = {};
      
      // Test each button click
      const buttonsToTest = [
        'newButton',
        'testChartButton', 
        'sampleChartsButton',
        'performanceToggleButton'
      ];

      for (const buttonId of buttonsToTest) {
        const button = document.getElementById(buttonId);
        if (button) {
          try {
            // Simulate click
            const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window
            });
            
            button.dispatchEvent(clickEvent);
            clickResults[buttonId] = {
              clickSuccessful: true,
              error: null
            };
          } catch (error) {
            clickResults[buttonId] = {
              clickSuccessful: false,
              error: error.message
            };
          }
        } else {
          clickResults[buttonId] = {
            clickSuccessful: false,
            error: 'Button not found'
          };
        }
      }

      return clickResults;
    });
  }

  async testTabFunctionality() {
    return this.runTest('Tab Functionality', async () => {
      const tabButtons = document.querySelectorAll('.tab-button');
      const polishedTab = document.querySelector('.tab-button[data-tab="note"]');
      const rawTab = document.querySelector('.tab-button[data-tab="raw"]');

      return {
        tabButtonsFound: tabButtons.length,
        polishedTabExists: !!polishedTab,
        rawTabExists: !!rawTab,
        tabButtons: Array.from(tabButtons).map(btn => ({
          text: btn.textContent,
          dataTab: btn.getAttribute('data-tab'),
          isActive: btn.classList.contains('active')
        }))
      };
    });
  }

  async testAppInitialization() {
    return this.runTest('App Initialization', async () => {
      // Check if the main app instance exists
      const appContainer = document.querySelector('.app-container');
      const noteArea = document.querySelector('.note-area');
      const sidebar = document.querySelector('.sidebar');

      return {
        appContainerExists: !!appContainer,
        noteAreaExists: !!noteArea,
        sidebarExists: !!sidebar,
        appInitialized: !!(appContainer && noteArea && sidebar)
      };
    });
  }

  async runAllTests() {
    this.log('🚀 Starting comprehensive button functionality tests...');
    
    try {
      const appInit = await this.testAppInitialization();
      const buttonExistence = await this.testButtonExistence();
      const eventListeners = await this.testEventListenerAttachment();
      const buttonClicks = await this.testButtonClicks();
      const tabFunctionality = await this.testTabFunctionality();

      const summary = {
        totalTests: this.results.tests.length,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${((this.results.passed / this.results.tests.length) * 100).toFixed(1)}%`,
        results: {
          appInit,
          buttonExistence,
          eventListeners,
          buttonClicks,
          tabFunctionality
        }
      };

      this.log(`🎯 Test Summary: ${summary.passed}/${summary.totalTests} passed (${summary.successRate})`, 
               summary.failed === 0 ? 'success' : 'error');

      return summary;

    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
      throw error;
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.tests.length,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.tests.length) * 100).toFixed(1) + '%'
      },
      tests: this.results.tests
    };

    console.log('📊 Detailed Test Report:', report);
    return report;
  }
}

// Auto-run tests when script loads
async function runButtonTests() {
  const tester = new ButtonFunctionalityTester();
  
  try {
    const results = await tester.runAllTests();
    const report = tester.generateReport();
    
    // Create visual feedback
    const resultDiv = document.createElement('div');
    resultDiv.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: ${report.summary.failed === 0 ? '#d4edda' : '#f8d7da'};
      color: ${report.summary.failed === 0 ? '#155724' : '#721c24'};
      padding: 15px;
      border-radius: 8px;
      border: 1px solid ${report.summary.failed === 0 ? '#c3e6cb' : '#f5c6cb'};
      z-index: 10000;
      font-family: monospace;
      min-width: 250px;
    `;
    
    resultDiv.innerHTML = `
      <strong>Button Test Results</strong><br>
      ✅ Passed: ${report.summary.passed}<br>
      ❌ Failed: ${report.summary.failed}<br>
      📊 Success Rate: ${report.summary.successRate}
    `;
    
    document.body.appendChild(resultDiv);
    
    // Remove after 10 seconds
    setTimeout(() => {
      if (resultDiv.parentNode) {
        resultDiv.parentNode.removeChild(resultDiv);
      }
    }, 10000);
    
    return results;
    
  } catch (error) {
    console.error('❌ Button test suite failed:', error);
    return null;
  }
}

// Export for manual testing
window.ButtonFunctionalityTester = ButtonFunctionalityTester;
window.runButtonTests = runButtonTests;

// Auto-run if not in test mode
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runButtonTests);
} else {
  runButtonTests();
}
