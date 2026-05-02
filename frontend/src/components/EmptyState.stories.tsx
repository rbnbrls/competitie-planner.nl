/*
 * File: frontend/src/components/EmptyState.stories.tsx
 * Last updated: 2026-05-02
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./EmptyState";
import { Users, Trophy, Calendar, FolderOpen } from "lucide-react";

const meta: Meta<typeof EmptyState> = {
  title: "Components/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const TableVariant: Story = {
  args: {
    icon: Users,
    title: "Geen gebruikers gevonden",
    variant: "table",
    colSpan: 5,
  },
};

export const TableWithAction: Story = {
  args: {
    icon: Trophy,
    title: "Nog geen teams toegevoegd",
    description: "Voeg je eerste team toe om te beginnen met de competitie.",
    actionLabel: "Team toevoegen",
    variant: "table",
    colSpan: 6,
  },
};

export const CardVariant: Story = {
  args: {
    icon: Calendar,
    title: "Geen speelrondes gepland",
    description: "Er zijn nog geen speelrondes aangemaakt voor deze competitie.",
    actionLabel: "Speelronde aanmaken",
    variant: "card",
  },
};

export const PageVariant: Story = {
  args: {
    icon: FolderOpen,
    title: "Geen historie beschikbaar",
    description:
      "Zodra speelrondes zijn gepubliceerd en toegewezen, wordt hier de baanverdeling over het seizoen inzichtelijk.",
    actionLabel: "Ga terug",
    variant: "page",
  },
};

export const ZeroItems: Story = {
  args: {
    icon: Users,
    title: "Nog geen teams toegevoegd",
    description: "Voeg je eerste team toe om te beginnen met de competitie.",
    actionLabel: "Team toevoegen",
    variant: "card",
  },
};

export const WithOneItem: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-lg">
      <EmptyState
        icon={Users}
        title="Nog geen teams toegevoegd"
        description="Voeg je eerste team toe om te beginnen."
        actionLabel="Team toevoegen"
      />
    </div>
  ),
};

export const WithManyItems: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-lg">
      <p className="text-sm text-gray-500">This state is not shown when there are many items.</p>
    </div>
  ),
};
