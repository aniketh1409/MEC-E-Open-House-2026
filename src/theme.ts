import { createTheme, type MantineColorsTuple } from "@mantine/core";

const ualbertaGreen: MantineColorsTuple = [
  "#edf6f0", "#d9eadf", "#b4d6c1", "#8dc0a1", "#68ab83",
  "#46976a", "#258551", "#007a33", "#275d38", "#153d24",
];

const ualbertaGold: MantineColorsTuple = [
  "#fff9df", "#fff1b1", "#ffe77f", "#ffdd4b", "#f8d424",
  "#f2cd00", "#d3b300", "#ad9200", "#877200", "#625200",
];

export const theme = createTheme({
  colors: { ualbertaGreen, ualbertaGold },
  primaryColor: "ualbertaGreen",
  primaryShade: 7,
  defaultRadius: "md",
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  headings: {
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: "750",
  },
  focusRing: "auto",
});
