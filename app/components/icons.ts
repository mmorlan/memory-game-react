import {
  // UI utilities (not game icons)
  ChevronDown, Clock,
  // Standard game icons — used in Freeplay and Survival Level 1
  AlarmClock, Baby, Banana, Bath, Bed, Bell, Birdhouse, Book, Carrot, Cat,
  Coffee, Cone, Crown, CupSoda,
  Dog, DollarSign, Donut, Droplet, Drum, Drumstick, Dumbbell, Ear, Egg, Feather,
  Fish, Footprints, Gamepad, Gem, Ghost, Gift, Glasses, Globe, Guitar,
  Hammer, Hand, Headphones, Heart, Hourglass, House, IceCreamCone,
  Key, Keyboard, Lamp, Landmark, Laugh, Lightbulb, Lock, Magnet, Mail,
  Martini, Medal, Milk, Moon, Mountain, Music, Nut, Paintbrush, Palette,
  PartyPopper, Pi, Pickaxe, Pizza, Plane, Popcorn, Popsicle, Puzzle,
  Rabbit, Rainbow, Rose, Ruler, Sailboat, Shell, Soup, Sprout,
  Star, Sun, Thermometer, Tornado, Volleyball, Zap,
  // Similar icons — Survival Level 2/3 only
  ArrowBigDown, ArrowBigLeft, ArrowBigUp, ArrowBigRight,
  BookCheck, BookHeart, BookImage, BookPlus,
  ChartNoAxesColumn, ChartNoAxesColumnDecreasing, ChartNoAxesColumnIncreasing,
  CloudDrizzle, CloudFog, CloudLightning, CloudRainWind, CloudSun, Cloudy,
  Clock1, Clock3, Clock5, Clock8, Clock10,
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
  type LucideIcon,
} from "lucide-react";

export { ChevronDown, Clock };

// All icons — standard + similar — used for rendering cards on the board
export const ICON_MAP: Record<string, LucideIcon> = {
  // Standard
  AlarmClock, Baby, Banana, Bath, Bed, Bell, Birdhouse, Book, Carrot, Cat,
  Coffee, Cone, Crown, CupSoda,
  Dog, DollarSign, Donut, Droplet, Drum, Drumstick, Dumbbell, Ear, Egg, Feather,
  Fish, Footprints, Gamepad, Gem, Ghost, Gift, Glasses, Globe, Guitar,
  Hammer, Hand, Headphones, Heart, Hourglass, House, IceCreamCone,
  Key, Keyboard, Lamp, Landmark, Laugh, Lightbulb, Lock, Magnet, Mail,
  Martini, Medal, Milk, Moon, Mountain, Music, Nut, Paintbrush, Palette,
  PartyPopper, Pi, Pickaxe, Pizza, Plane, Popcorn, Popsicle, Puzzle,
  Rabbit, Rainbow, Rose, Ruler, Sailboat, Shell, Soup, Sprout,
  Star, Sun, Thermometer, Tornado, Volleyball, Zap,
  // Similar
  ArrowBigDown, ArrowBigLeft, ArrowBigUp, ArrowBigRight,
  BookCheck, BookHeart, BookImage, BookPlus,
  ChartNoAxesColumn, ChartNoAxesColumnDecreasing, ChartNoAxesColumnIncreasing,
  CloudDrizzle, CloudFog, CloudLightning, CloudRainWind, CloudSun, Cloudy,
  Clock1, Clock3, Clock5, Clock8, Clock10,
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
};

// Standard icon names — Freeplay and Survival Level 1 only
export const ICON_NAMES: string[] = [
  "AlarmClock", "Baby", "Banana", "Bath", "Bed", "Bell", "Birdhouse", "Book", "Carrot", "Cat",
  "Coffee", "Cone", "Crown", "CupSoda",
  "Dog", "DollarSign", "Donut", "Droplet", "Drum", "Drumstick", "Dumbbell", "Ear", "Egg", "Feather",
  "Fish", "Footprints", "Gamepad", "Gem", "Ghost", "Gift", "Glasses", "Globe", "Guitar",
  "Hammer", "Hand", "Headphones", "Heart", "Hourglass", "House", "IceCreamCone",
  "Key", "Keyboard", "Lamp", "Landmark", "Laugh", "Lightbulb", "Lock", "Magnet", "Mail",
  "Martini", "Medal", "Milk", "Moon", "Mountain", "Music", "Nut", "Paintbrush", "Palette",
  "PartyPopper", "Pi", "Pickaxe", "Pizza", "Plane", "Popcorn", "Popsicle", "Puzzle",
  "Rabbit", "Rainbow", "Rose", "Ruler", "Sailboat", "Shell", "Soup", "Sprout",
  "Star", "Sun", "Thermometer", "Tornado", "Volleyball", "Zap",
];

// Similar icon groups — Survival Level 2/3 only.
// Rule: each group used on a board must contribute ≥ 2 icons.
export const SIMILAR_ICON_GROUPS: string[][] = [
  ["ArrowBigDown", "ArrowBigLeft", "ArrowBigUp", "ArrowBigRight"],
  ["BookCheck", "BookHeart", "BookImage", "BookPlus"],
  [
    "CloudDrizzle", "CloudFog", "CloudLightning", "CloudRainWind", "CloudSun", "Cloudy",
    "ChartNoAxesColumn", "ChartNoAxesColumnDecreasing", "ChartNoAxesColumnIncreasing",
  ],
  ["Clock1", "Clock3", "Clock5", "Clock8", "Clock10"],
  ["Dice1", "Dice2", "Dice3", "Dice4", "Dice5", "Dice6"],
];
