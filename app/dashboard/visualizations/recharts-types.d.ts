// Recharts type declarations to facilitate dynamic imports
import * as React from 'react';

// This file provides simplified type declarations that make TypeScript happy
// while allowing us to use dynamic imports with Next.js

declare module 'recharts' {
  export interface CommonProps {
    [key: string]: any;
  }

  export class BarChart extends React.Component<CommonProps> {}
  export class Bar extends React.Component<CommonProps> {}
  export class LineChart extends React.Component<CommonProps> {}
  export class Line extends React.Component<CommonProps> {}
  export class XAxis extends React.Component<CommonProps> {}
  export class YAxis extends React.Component<CommonProps> {}
  export class CartesianGrid extends React.Component<CommonProps> {}
  export class RadarChart extends React.Component<CommonProps> {}
  export class Radar extends React.Component<CommonProps> {}
  export class PolarGrid extends React.Component<CommonProps> {}
  export class PolarAngleAxis extends React.Component<CommonProps> {}
  export class LabelList extends React.Component<CommonProps> {}
  export class Tooltip extends React.Component<CommonProps> {}
  export class Legend extends React.Component<CommonProps> {}
  export class ResponsiveContainer extends React.Component<CommonProps> {}
  export class PieChart extends React.Component<CommonProps> {}
  export class Pie extends React.Component<CommonProps> {}
  export class Cell extends React.Component<CommonProps> {}
  export class AreaChart extends React.Component<CommonProps> {}
  export class Area extends React.Component<CommonProps> {}
  export class ScatterChart extends React.Component<CommonProps> {}
  export class Scatter extends React.Component<CommonProps> {}
  export class ZAxis extends React.Component<CommonProps> {}
}
