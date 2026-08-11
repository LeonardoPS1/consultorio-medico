import type { TrackReferenceOrPlaceholder } from '@livekit/components-core';
import type { ComponentType, HTMLAttributes } from 'react';

export interface FocusLayoutProps extends HTMLAttributes<HTMLElement> {
  trackRef?: TrackReferenceOrPlaceholder;
}

export interface FocusLayoutContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export declare const FocusLayout: ComponentType<FocusLayoutProps>;
export declare const FocusLayoutContainer: ComponentType<FocusLayoutContainerProps>;
export declare const GridLayout: ComponentType<HTMLAttributes<HTMLDivElement>>;
export declare const CarouselLayout: ComponentType<HTMLAttributes<HTMLDivElement>>;

declare module '@livekit/components-react' {
  export { FocusLayout, FocusLayoutContainer, GridLayout, CarouselLayout } from './components-react';
}