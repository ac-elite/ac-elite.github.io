import type { Props as ApexProps } from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

import { useMemo, useState, useEffect } from 'react';
import { mergeWith } from 'es-toolkit';
import ReactApexChart from 'react-apexcharts';

import Box, { type BoxProps } from '@mui/material/Box';

import { BRAND } from 'src/lib/glass';

// ----------------------------------------------------------------------

/** Brand-led categorical palette: accent blue first, then semantic + supporting hues. */
export const CHART_COLORS = ['#5B8DEF', '#22C55E', '#F59E0B', '#A78BFA', '#38BDF8', '#F472B6'];

const CHART_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter Variable", "Inter", system-ui, "Segoe UI", Roboto, sans-serif';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}

/**
 * Apple Health / Stocks-style defaults: transparent canvas, smooth curves,
 * gradient area fills, hairline grid, muted axis labels, dark glass tooltip.
 */
function baseChartOptions(reducedMotion: boolean): ApexOptions {
  return {
    chart: {
      fontFamily: CHART_FONT,
      foreColor: 'rgba(255,255,255,0.6)',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      parentHeightOffset: 0,
      animations: {
        enabled: !reducedMotion,
        speed: 700,
        animateGradually: { enabled: !reducedMotion, delay: 120 },
        dynamicAnimation: { enabled: !reducedMotion, speed: 420 },
      },
    },
    colors: CHART_COLORS,
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, type: 'vertical', opacityFrom: 0.42, opacityTo: 0.02, stops: [0, 96] },
    },
    grid: {
      borderColor: 'rgba(255,255,255,0.06)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { top: 8, right: 12, bottom: 0, left: 8 },
    },
    xaxis: {
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 } },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: { style: { colors: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 } },
    },
    legend: {
      labels: { colors: 'rgba(255,255,255,0.72)' },
      fontSize: '13px',
      fontWeight: 600,
      itemMargin: { horizontal: 10, vertical: 4 },
    },
    tooltip: {
      theme: 'dark',
      style: { fontSize: '12px', fontFamily: CHART_FONT },
    },
    markers: { size: 0, strokeWidth: 0, hover: { size: 5 } },
    states: {
      hover: { filter: { type: 'lighten' } },
      active: { filter: { type: 'none' } },
    },
  };
}

/** Replace arrays wholesale on merge (don't index-merge colors / categories / axes). */
function replaceArrays(_target: unknown, source: unknown) {
  if (Array.isArray(source)) return source;
  return undefined;
}

export type ChartProps = {
  type?: ApexProps['type'];
  series: ApexProps['series'];
  options?: ApexOptions;
  height?: number | string;
  width?: number | string;
  sx?: BoxProps['sx'];
};

/**
 * Brand-themed ApexCharts wrapper. Pass `series` + optional `options`; brand
 * defaults are deep-merged underneath (consumer values win). Honours
 * `prefers-reduced-motion` by disabling chart animations.
 */
export function Chart({ type = 'area', series, options, height = 280, width = '100%', sx }: ChartProps) {
  const reducedMotion = usePrefersReducedMotion();

  const mergedOptions = useMemo(
    () => mergeWith(baseChartOptions(reducedMotion), options ?? {}, replaceArrays),
    [options, reducedMotion]
  );

  return (
    <Box
      sx={[
        {
          // Premium glass tooltip to match the site material.
          '& .apexcharts-tooltip.apexcharts-theme-dark': {
            borderRadius: '12px !important',
            border: '1px solid rgba(255,255,255,0.12) !important',
            background: `${BRAND.navBase} !important`,
            backdropFilter: 'blur(14px) saturate(160%)',
            boxShadow: '0 12px 32px -8px rgba(0,0,0,0.65) !important',
          },
          '& .apexcharts-tooltip-title': {
            background: 'rgba(255,255,255,0.05) !important',
            borderBottom: '1px solid rgba(255,255,255,0.08) !important',
            fontWeight: 700,
          },
          '& .apexcharts-xaxistooltip, & .apexcharts-yaxistooltip': {
            borderRadius: '8px !important',
            border: '1px solid rgba(255,255,255,0.12) !important',
            background: `${BRAND.navBase} !important`,
            color: 'rgba(255,255,255,0.9) !important',
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <ReactApexChart type={type} series={series} options={mergedOptions} height={height} width={width} />
    </Box>
  );
}
