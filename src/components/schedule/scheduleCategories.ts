import {
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconPresentation,
  IconToolsKitchen2,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import type { ScheduleCategory } from "../../types/content";

export const scheduleCategories: Record<ScheduleCategory, { label: string; icon: Icon; color: string }> = {
  presentation: { label: "Presentations", icon: IconPresentation, color: "ualbertaGreen" },
  tour: { label: "Tours", icon: IconBuildingSkyscraper, color: "ualbertaGold" },
  "booth-fair": { label: "Booth fair", icon: IconUsersGroup, color: "blue" },
  food: { label: "Food", icon: IconToolsKitchen2, color: "orange" },
  general: { label: "General", icon: IconCalendarEvent, color: "gray" },
};
