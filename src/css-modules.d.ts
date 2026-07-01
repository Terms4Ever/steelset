// Ambient declaration for CSS module imports (used by the web build's animated-icon.web.tsx).
// Kept in src/ so it's always covered by the tsconfig "**/*.ts" include, resilient to the
// expo web dev server rewriting tsconfig/expo-env.d.ts.
declare module '*.module.css';
