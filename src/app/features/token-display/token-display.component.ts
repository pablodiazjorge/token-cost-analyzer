import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  effect,
  input,
  viewChild,
  AfterRenderPhase,
  afterRender,
} from '@angular/core';
import * as d3 from 'd3';
import { TokenDistribution } from '../../core/models/token-analysis.model';

/**
 * Standalone component that renders a horizontal bar chart using D3.js
 * showing the token distribution by category.
 *
 * It accepts `distribution` and `totalTokens` as inputs and re-renders
 * the chart reactively using Angular's `effect()`.
 */
@Component({
  selector: 'app-token-display',
  imports: [DecimalPipe],
  templateUrl: './token-display.component.html',
  styleUrls: ['./token-display.component.scss'],
})
export class TokenDisplayComponent {
  /** Token distribution data from the analysis result */
  distribution = input<TokenDistribution[]>([]);

  /** Total number of tokens */
  totalTokens = input<number>(0);

  /** Reference to the SVG container element */
  readonly chartContainer = viewChild<ElementRef<HTMLDivElement>>('chartContainer');

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

  constructor() {
    // Use afterRender with 'write' phase to ensure DOM is ready before D3 manipulation
    afterRender(() => {
      this.renderChart();
    }, { phase: AfterRenderPhase.Write });

    // Reactive effect: re-render whenever distribution or totalTokens changes
    effect(() => {
      // Reading the signals to track dependencies
      const dist = this.distribution();
      const total = this.totalTokens();
      // Defer rendering slightly so the viewChild is available
      if (dist && this.chartContainer()) {
        this.renderChart();
      }
    });
  }

  private renderChart(): void {
    const container = this.chartContainer();
    if (!container) {
      return;
    }

    const data = this.distribution();
    if (!data || data.length === 0) {
      return;
    }

    const element = container.nativeElement;

    // Clear previous chart
    element.innerHTML = '';

    // Tight margins — wider card means labels fit comfortably
    const margin = { top: 10, right: 8, bottom: 10, left: 95 };
    const containerWidth = element.clientWidth;
    const chartWidth = containerWidth - margin.left - margin.right;
    const barHeight = 28;
    const barGap = 8;
    const height = data.length * (barHeight + barGap) + margin.top + margin.bottom;

    // Color scale
    const colorScale = d3.scaleOrdinal<string>(d3.schemeSet2);

    // X scale always uses domain [0, 100] for consistent sizing
    const xScale = d3.scaleLinear().domain([0, 100]).range([0, chartWidth]);

    // Create SVG — never wider than container
    const svg = d3
      .select(element)
      .append('svg')
      .attr('width', containerWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Bars
    const barGroups = svg
      .selectAll('g.bar-group')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('transform', (_, i) => `translate(0,${i * (barHeight + barGap)})`);

    // Background bar (full chart width)
    barGroups
      .append('rect')
      .attr('class', 'bar-bg')
      .attr('width', chartWidth)
      .attr('height', barHeight)
      .attr('rx', 4)
      .attr('fill', '#dce8dc');

    // Foreground bar
    barGroups
      .append('rect')
      .attr('class', 'bar-fg')
      .attr('width', (d) => Math.max(xScale(d.percentage), 4))
      .attr('height', barHeight)
      .attr('rx', 4)
      .attr('fill', (d) => colorScale(d.type))
      .attr('fill-opacity', 0.85)
      .on('mouseover', function (event: MouseEvent, d: TokenDistribution) {
        d3.select(this).attr('fill-opacity', 1);
        const tooltip = d3.select(container.nativeElement).append('div').attr('class', 'd3-tooltip');
        tooltip
          .html(`<strong>${d.type}</strong><br/>Count: ${d.count}<br/>${d.percentage.toFixed(1)}%`)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 40}px`);
      })
      .on('mousemove', function (event: MouseEvent) {
        d3.select(container.nativeElement)
          .select('.d3-tooltip')
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 40}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('fill-opacity', 0.85);
        d3.select(container.nativeElement).select('.d3-tooltip').remove();
      });

    // Category labels (left side, truncated if needed)
    barGroups
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', -6)
      .attr('y', barHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#2a4a2a')
      .style('font-size', '0.8rem')
      .style('font-weight', '500')
      .text((d) => d.type);

    // Percentage labels — always inside or at the very end of the bar
    barGroups
      .append('text')
      .attr('class', 'bar-pct')
      .attr('x', (d) => {
        const barW = xScale(d.percentage);
        // If bar is wide enough, place label inside at the right edge
        // Otherwise place it just after the bar
        return barW > 50 ? barW - 6 : barW + 4;
      })
      .attr('y', barHeight / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => xScale(d.percentage) > 50 ? 'end' : 'start')
      .attr('fill', (d) => xScale(d.percentage) > 50 ? '#fff' : '#3a5a3a')
      .style('font-size', '0.72rem')
      .style('font-weight', '600')
      .text((d) => `${d.percentage.toFixed(0)}%`);
  }
}
