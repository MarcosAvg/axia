import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// El compilador de React corre desde el pipeline de Babel.
// Ver: https://react.dev/learn/react-compiler/installation
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
})
