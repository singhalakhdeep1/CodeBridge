import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
    parameters: {
        controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
        a11y: { config: { rules: [{ id: "color-contrast", enabled: true }] } },
        nextjs: { appDirectory: true },
        backgrounds: {
            default: "dark",
            values: [
                { name: "dark", value: "#0a0a0a" },
                { name: "light", value: "#ffffff" },
            ],
        },
    },
};

export default preview;
