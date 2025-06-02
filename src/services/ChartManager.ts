/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  Legend,
  Tooltip,
  Title,
} from 'chart.js';
import { ChartConfig } from '../types/index.js';
import { COLORS } from '../constants.js';
import { ErrorHandler } from '../utils.js';

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  PieController,
  ArcElement,
  Legend,
  Tooltip,
  Title
);

export class ChartManager {
  private charts: Map<string, Chart> = new Map();
  private readonly defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
      },
    },
  };

  public createChartContainer(
    chartDisplayArea: HTMLElement,
    canvasId: string,
    title: string,
    description: string
  ): HTMLCanvasElement | null {
    try {
      const chartContainer = document.createElement('div');
      chartContainer.className = 'chart-container'; // Add class for styling

      const chartHeader = document.createElement('div');
      chartHeader.className = 'chart-header';

      const chartTitleElement = document.createElement('h4');
      chartTitleElement.innerText = title;
      chartHeader.appendChild(chartTitleElement);

      if (description) {
        const chartDescriptionElement = document.createElement('p');
        chartDescriptionElement.className = 'chart-description';
        chartDescriptionElement.innerText = description;
        chartHeader.appendChild(chartDescriptionElement);
      }
      
      chartContainer.appendChild(chartHeader);

      const canvasElement = document.createElement('canvas');
      canvasElement.id = canvasId;
      canvasElement.width = 400; // Default width, can be overridden by CSS or options
      canvasElement.height = 200; // Default height
      chartContainer.appendChild(canvasElement);

      chartDisplayArea.appendChild(chartContainer);
      return canvasElement;
    } catch (error) {
      ErrorHandler.logError(`Failed to create chart container for canvasId: ${canvasId}`, error);
      return null;
    }
  }

  public static getChartTitle(chartType: string): string {
    switch (chartType) {
      case 'topics':
        return 'Topic Distribution';
      case 'sentiment':
        return 'Sentiment Analysis';
      case 'wordFrequency':
        return 'Word Frequency';
      case 'line':
        return 'Trend Over Time'; // Example for line chart
      default:
        return 'Chart';
    }
  }

  public static getChartDescription(chartType: string): string {
    switch (chartType) {
      case 'topics':
        return 'Main topics identified in your transcription.';
      case 'sentiment':
        return 'Emotional tone breakdown of your content.';
      case 'wordFrequency':
        return 'Most frequently used words in your transcription.';
      case 'line':
        return 'Shows trends or progression of data points.'; // Example
      default:
        return 'Data visualization.';
    }
  }

  public createChart(canvasElement: HTMLCanvasElement, config: ChartConfig): Chart | null {
    if (!canvasElement) {
      ErrorHandler.logError('Canvas element provided to createChart is null or undefined.', new Error('NullCanvasElement'));
      return null;
    }
    try {
      // Destroy existing chart if it exists for this canvas's ID
      this.destroyChart(canvasElement.id);

      const ctx = canvasElement.getContext('2d');
      if (!ctx) {
        throw new Error(`Could not get 2D context for canvas '${canvasElement.id}'`);
      }

      const chartConfig = {
        type: config.type,
        data: config.data,
        options: {
          ...this.defaultOptions,
          ...config.options,
        },
      };

      const chart = new Chart(ctx, chartConfig);
      this.charts.set(canvasElement.id, chart);
      
      return chart;
    } catch (error) {
      ErrorHandler.logError(`Failed to create chart for canvas: ${canvasElement.id}`, error);
      return null;
    }
  }

  public createTopicChart(canvasElement: HTMLCanvasElement, data: any, title: string = 'Topic Distribution'): Chart | null {
    const config: ChartConfig = {
      type: 'pie',
      data: {
        labels: data.labels || [],
        datasets: [{
          data: data.data || [],
          backgroundColor: data.backgroundColor || COLORS.chartBackgrounds,
          borderColor: COLORS.chartBorders,
          borderWidth: 2,
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    };

    return this.createChart(canvasElement, config);
  }

  public createSentimentChart(canvasElement: HTMLCanvasElement, data: any, title: string = 'Sentiment Analysis'): Chart | null {
    const config: ChartConfig = {
      type: 'doughnut',
      data: {
        labels: data.labels || ['Positive', 'Neutral', 'Negative'],
        datasets: [{
          data: data.data || [0, 0, 0],
          backgroundColor: data.backgroundColor || ['#4CAF50', '#FFC107', '#F44336'],
          borderColor: ['#388E3C', '#F57C00', '#D32F2F'],
          borderWidth: 2,
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
          },
          legend: {
            position: 'bottom',
          },
        },
        cutout: '50%',
      },
    };

    return this.createChart(canvasElement, config);
  }

  public createWordFrequencyChart(canvasElement: HTMLCanvasElement, data: any, title: string = 'Word Frequency'): Chart | null {
    const config: ChartConfig = {
      type: 'bar',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: 'Frequency',
          data: data.data || [],
          backgroundColor: data.backgroundColor || COLORS.chartBackgrounds,
          borderColor: COLORS.chartBorders,
          borderWidth: 1,
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Frequency',
            },
          },
          x: {
            title: {
              display: true,
              text: 'Words',
            },
          },
        },
      },
    };

    return this.createChart(canvasElement, config);
  }

  public createLineChart(canvasElement: HTMLCanvasElement, data: any, title: string = 'Line Chart'): Chart | null {
    const config: ChartConfig = {
      type: 'line',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: data.label || 'Data',
          data: data.data || [],
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primaryLight,
          borderWidth: 2,
          fill: false,
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    return this.createChart(canvasElement, config);
  }

  public destroyChart(canvasIdOrElement: string | HTMLCanvasElement): void {
    const canvasId = typeof canvasIdOrElement === 'string' ? canvasIdOrElement : canvasIdOrElement.id;
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.destroy();
      this.charts.delete(canvasId);
    }
  }

  public destroyAllCharts(): void {
    this.charts.forEach((chart) => { // Removed canvasId from params as it's not used
      chart.destroy();
    });
    this.charts.clear();
  }

  public getChart(canvasId: string): Chart | undefined {
    return this.charts.get(canvasId);
  }

  public updateChart(canvasId: string, newData: any): boolean {
    try {
      const chart = this.charts.get(canvasId);
      if (!chart) {
        return false;
      }

      chart.data = newData;
      chart.update();
      return true;
    } catch (error) {
      ErrorHandler.logError(`Failed to update chart: ${canvasId}`, error);
      return false;
    }
  }

  public resizeChart(canvasId: string): void {
    const chart = this.charts.get(canvasId);
    if (chart) {
      chart.resize();
    }
  }

  public resizeAllCharts(): void {
    this.charts.forEach(chart => {
      chart.resize();
    });
  }
}
