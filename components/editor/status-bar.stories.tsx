import type { Meta, StoryObj } from "@storybook/react";
import { StatusBar } from "@/components/editor/status-bar";

const meta: Meta<typeof StatusBar> = {
    title: "Editor/StatusBar",
    component: StatusBar,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
        nextjs: { appDirectory: true },
        backgrounds: { default: "dark" },
    },
    argTypes: {
        syncStatus: {
            control: "select",
            options: ["synced", "syncing", "offline"],
        },
        language: {
            control: "select",
            options: ["typescript", "javascript", "python", "rust", "go", "cpp"],
        },
    },
};

export default meta;
type Story = StoryObj<typeof StatusBar>;

export const Synced: Story = {
    args: {
        language: "typescript",
        cursorLine: 42,
        cursorCol: 18,
        collaboratorCount: 3,
        syncStatus: "synced",
    },
};

export const Syncing: Story = {
    args: {
        language: "python",
        cursorLine: 1,
        cursorCol: 1,
        collaboratorCount: 1,
        syncStatus: "syncing",
    },
};

export const Offline: Story = {
    args: {
        language: "rust",
        cursorLine: 200,
        cursorCol: 80,
        collaboratorCount: 0,
        syncStatus: "offline",
    },
};

export const ManyCollaborators: Story = {
    args: {
        language: "go",
        cursorLine: 15,
        cursorCol: 4,
        collaboratorCount: 12,
        syncStatus: "synced",
    },
};
