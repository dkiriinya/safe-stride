import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Route Planner | SafeStride',
  description: 'Interactive route elevation and pedestrian safety planner for urban runners.',
};

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
