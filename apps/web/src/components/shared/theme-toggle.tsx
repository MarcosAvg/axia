import type { LucideIcon } from 'lucide-react'
import { MonitorIcon, MoonIcon, PaletteIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { messages } from '@/lib/i18n'
import { COLOR_MODES, THEMES, isColorMode, isThemeName } from '@/lib/theme'
import type { ColorMode } from '@/lib/theme'
import { useTheme } from './theme-context'

const modeIcons: Record<ColorMode, LucideIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
}

/** Selector de tema de color y de modo (claro / oscuro / sistema). */
export function ThemeToggle() {
  const { theme, mode, setTheme, setMode } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          aria-label={messages.theme.aria}
        >
          <PaletteIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>{messages.theme.colorLabel}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isThemeName(value)) setTheme(value)
          }}
        >
          {THEMES.map((name) => (
            <DropdownMenuRadioItem key={name} value={name}>
              {messages.theme.themes[name]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{messages.theme.modeLabel}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => {
            if (isColorMode(value)) setMode(value)
          }}
        >
          {COLOR_MODES.map((name) => {
            const Icon = modeIcons[name]
            return (
              <DropdownMenuRadioItem key={name} value={name}>
                <Icon />
                {messages.theme.modes[name]}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
