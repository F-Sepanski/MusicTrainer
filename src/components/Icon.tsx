/**
 * Icon — wrapper around FontAwesome solid icons (bundled locally).
 * Keeps the same API as before so components don't change.
 *
 * @module components/Icon
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faGear,
  faClockRotateLeft,
  faMicrophone,
  faMusic,
  faSliders,
  faBullseye,
  faGuitar,
  faCheck,
  faSun,
  faMoon,
  faArrowLeft,
  faArrowRight,
  faWandMagicSparkles,
  faHourglass,
  faKeyboard,
  faWind,
  faHouse,
  faChevronRight,
  faChartLine,
  faRepeat,
  faLock,
  faPalette,
  faEraser,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { IconName } from '@/shared/domain';

export type { IconName };

const ICONS: Record<IconName, IconDefinition> = {
  play: faPlay,
  settings: faGear,
  history: faClockRotateLeft,
  mic: faMicrophone,
  music: faMusic,
  tuning: faSliders,
  target: faBullseye,
  instrument: faGuitar,
  clef: faMusic,
  check: faCheck,
  sun: faSun,
  moon: faMoon,
  back: faArrowLeft,
  forward: faArrowRight,
  sparkles: faWandMagicSparkles,
  clock: faHourglass,
  piano: faKeyboard,
  guitar: faGuitar,
  violin: faMusic,
  flute: faMusic,
  sax: faWind,
  trumpet: faMusic,
  voice: faMicrophone,
  other: faMusic,
  wizard: faWandMagicSparkles,
  'chevron-right': faChevronRight,
  chart: faChartLine,
  home: faHouse,
  repeat: faRepeat,
  'guitar-full': faGuitar,
  keyboard: faKeyboard,
  lock: faLock,
  palette: faPalette,
  eraser: faEraser,
  keys: faMusic,
  sharp: faMusic,
  treble: faMusic,
  bass: faMusic,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 24, className }: IconProps) {
  return <FontAwesomeIcon icon={ICONS[name]} className={className} style={{ fontSize: size, width: size, height: size }} />;
}
